import {
  RelationshipChangeSchema,
  type RelationshipChange,
  type RelationshipDraft,
  type RelationshipPreview,
  type RelationshipRules,
  type Resource,
  type ValidationReport,
} from "../../../packages/shared/src/index.js";
import { publishedBundle, publishProposal, saveProposal } from "./assistant.js";
import { assert, digest } from "./security.js";
import { resource, transaction, type Store } from "./store.js";

export async function relationshipRules(
  store: Store,
  scope: string,
): Promise<RelationshipRules> {
  const { bundle, proposal, generation } = await publishedBundle(store, scope);
  const datasets = new Map(
    (await store.list(scope, "dataset")).map((d) => [d.id, d]),
  );
  const jobs = (await store.list(scope, "job"))
    .filter((j) => j.data.type === "relationship_refresh")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const job = jobs[0];
  return {
    generation,
    relationships: bundle.relationships,
    previews: Object.fromEntries(
      bundle.relationships.flatMap((r) => {
        const key = "relation:" + r.name;
        const preview = proposal?.data.validation.previews[key];
        return preview ? [[key, preview]] : [];
      }),
    ),
    types: bundle.ontology.map((t) => {
      const profile = datasets.get(t.datasetId)?.data.profile;
      return {
        name: t.name,
        columns: (profile?.columns || []).map(
          (c: { name: string; type: string }) => ({
            name: c.name,
            type: c.type,
            sample: (profile.sample || [])
              .slice(0, 3)
              .map((r: Record<string, unknown>) => r[c.name]),
          }),
        ),
      };
    }),
    ...(job
      ? {
          refreshJob: {
            status: job.data.status,
            error: job.data.error,
            updatedAt: job.updatedAt,
          },
        }
      : {}),
  };
}

export async function previewRelationshipChange(
  store: Store,
  scope: string,
  input: RelationshipChange,
): Promise<RelationshipDraft> {
  const change = RelationshipChangeSchema.parse(input);
  const { bundle, generation } = await publishedBundle(store, scope);
  assert(generation, "Publish an ontology first");
  if (change.previousName)
    assert(
      bundle.relationships.some((r) => r.name === change.previousName),
      "Relationship rule unavailable",
      404,
    );
  if (change.operation === "upsert") {
    assert(
      !bundle.relationships.some(
        (r) =>
          r.name === change.relationship.name && r.name !== change.previousName,
      ),
      "A relationship rule with this name already exists",
      409,
    );
  }
  bundle.relationships = bundle.relationships.filter(
    (r) => r.name !== change.previousName,
  );
  if (change.operation === "upsert")
    bundle.relationships.push(change.relationship);
  const p = await saveProposal(store, scope, bundle);
  const report = p.data.validation as ValidationReport;
  assert(
    report.baseGeneration === generation,
    "Published definitions changed. Preview the relationship again.",
    409,
  );
  return {
    id: p.id,
    hash: p.data.hash,
    valid: report.valid,
    checks: report.checks,
    ...(change.operation === "upsert"
      ? {
          preview: report.previews[
            "relation:" + change.relationship.name
          ] as RelationshipPreview,
        }
      : {}),
  };
}

// Coalesce source updates into one durable refresh of the current definitions.
// A failed input signature is not rescheduled forever; the job exposes its error.
export async function queueRelationshipRefresh(store: Store, scope: string) {
  if (!(await store.get(scope, "workspace"))?.data.activeGeneration) return;
  const { bundle, proposal, generation } = await publishedBundle(store, scope);
  if (!proposal || !bundle.relationships.some((r) => r.refresh)) return;
  const report = proposal.data.validation as ValidationReport;
  const versions: Record<string, string> = {};
  for (const id of Object.keys(report.inputVersions)) {
    const d = await store.get(scope, id);
    if (d?.data.activeVersion) versions[id] = d.data.activeVersion;
  }
  if (
    Object.keys(report.inputVersions).every(
      (id) => versions[id] === report.inputVersions[id],
    )
  )
    return;
  const publications = await store.list(scope, "publication");
  const actor = publications.find((p) => p.data.generation === generation)?.data
    .actor;
  assert(actor, "The active publication has no actor for relationship refresh");
  const id =
    "relationship_refresh_" + digest(JSON.stringify({ bundle, versions }));
  await transaction(store, scope, async (tx) => {
    if ((await tx.get("workspace"))?.data.activeGeneration !== generation)
      return;
    if (await tx.get(id)) return;
    if (
      (await tx.list("job")).some(
        (j) =>
          j.data.type === "relationship_refresh" &&
          ["queued", "running"].includes(j.data.status),
      )
    )
      return;
    tx.put(
      resource(
        scope,
        "job",
        "Refresh ontology relationships",
        {
          type: "relationship_refresh",
          status: "queued",
          background: true,
          actor,
        },
        id,
      ),
    );
  });
}

export async function runRelationshipRefresh(
  store: Store,
  scope: string,
  job: Resource,
) {
  const { bundle, generation } = await publishedBundle(store, scope);
  if (!bundle.relationships.some((r) => r.refresh)) return;
  const saved = await store.get(scope, job.id);
  let p = saved?.data.proposalId
    ? await store.get(scope, saved.data.proposalId)
    : undefined;
  if (
    p?.data.status === "published" &&
    p.data.publishedGeneration === generation
  )
    return;
  let reusable =
    p?.data.status === "ready" &&
    p.data.validation.baseGeneration === generation;
  if (reusable)
    for (const [id, version] of Object.entries(
      p!.data.validation.inputVersions,
    ))
      if ((await store.get(scope, id))?.data.activeVersion !== version)
        reusable = false;
  if (!reusable) {
    const created = await saveProposal(store, scope, bundle);
    p = created;
    await transaction(store, scope, async (tx) => {
      const current = await tx.get(job.id);
      assert(
        current && current.data.status !== "canceled",
        "Relationship refresh canceled",
        409,
      );
      tx.update(current, { ...current.data, proposalId: created.id });
    });
  }
  assert(p, "Relationship refresh proposal unavailable");
  const report = p.data.validation as ValidationReport;
  assert(
    report.baseGeneration === generation,
    "Published definitions changed during relationship refresh",
    409,
  );
  assert(
    report.valid,
    "Relationship refresh failed validation: " +
      report.checks
        .filter((c) => !c.passed)
        .map((c) => c.detail)
        .join("; "),
    409,
  );
  assert(
    typeof job.data.actor === "string",
    "Relationship refresh actor missing",
  );
  await publishProposal(store, scope, p.id, p.data.hash, job.data.actor);
}
