import { useEffect, useState } from "react";
import ObjectActionForm from "./object-action-form";
import { Network, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace, useResources, PageHeader, Empty, Modal } from "./ui";
import { PublishedSchema } from "./areas/ontology/schema";
import type {
  Relationship,
  RelationshipRules,
  Resource,
} from "../../../packages/shared/src";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, number } from "./api";
import RelationshipRuleForm from "./relationship-rule-form";
export function OntologyPage() {
  const { role, id } = useWorkspace(),
    types = useResources("objectType"),
    datasets = useResources("dataset"),
    proposals = useResources("proposal"),
    [creating, setCreating] = useState(false),
    [editingRule, setEditingRule] = useState<Relationship | null | undefined>();
  const rules = useQuery({
    queryKey: [id, "relationship-rules"],
    queryFn: () =>
      api<RelationshipRules>(`/workspaces/${id}/ontology/relationships`),
    refetchInterval: 10000,
  });
  const qc = useQueryClient();
  useEffect(() => {
    if (rules.data?.generation) {
      void qc.invalidateQueries({ queryKey: [id, "objectType"] });
      void qc.invalidateQueries({ queryKey: [id, "proposal"] });
    }
  }, [rules.data?.generation, id, qc]);
  const list = [...(types.data?.items || [])],
    proposal = proposals.data?.items.find(
      (p: Resource) => p.data.publishedGeneration === list[0]?.data.generation,
    ),
    relations = proposal?.data.bundle.relationships || [];
  list.sort((a: Resource, b: Resource) =>
    relations.some((r: any) => r.fromType === a.name && r.toType === b.name)
      ? -1
      : relations.some((r: any) => r.fromType === b.name && r.toType === a.name)
        ? 1
        : 0,
  );
  return (
    <>
      <PageHeader
        eyebrow="THE SHAPE OF YOUR BUSINESS"
        title="Ontology"
        description="Real-world objects and relationships, grounded in your data."
      >
        {role !== "viewer" && types.data?.items.length > 0 && (
          <button
            className="button primary"
            disabled={!rules.data}
            onClick={() => setEditingRule(null)}
          >
            <Plus size={15} /> Define relationship
          </button>
        )}
        {role !== "viewer" && types.data?.items.length > 0 && (
          <button className="button" onClick={() => setCreating(true)}>
            <Plus size={15} /> Workspace action
          </button>
        )}
        <Link className="button" to="/proposals">
          <Sparkles size={16} /> Review suggestions
        </Link>
      </PageHeader>
      {list.length ? (
        <div className="ontology-schema">
          <PublishedSchema
            types={list}
            relationships={relations}
            previews={proposal?.data.validation?.previews || {}}
            datasets={datasets.data?.items || []}
          />
        </div>
      ) : (
        <div className="panel">
          <Empty
            icon={Network}
            title="Give your data a shared language"
            text="Foundry can suggest the customers, orders, and relationships hidden in your datasets. Publish a tested proposal to bring the model to life."
          />
        </div>
      )}
      {rules.error && (
        <div className="notice" role="alert">
          {rules.error.message}
        </div>
      )}
      {list.length > 0 && rules.data && (
        <section
          className="panel pad on-relationship-rules"
          aria-label="Relationship rules"
        >
          <h2>Relationship rules</h2>
          <p className="muted">
            Rules link all matching source records. Workspace actions link
            individual records instead.
          </p>
          {rules.data.refreshJob && (
            <p role="status">
              Last automatic refresh: {rules.data.refreshJob.status}
              {" · "}
              {new Date(rules.data.refreshJob.updatedAt).toLocaleString()}
              {rules.data.refreshJob.error
                ? ` - ${rules.data.refreshJob.error}`
                : ""}
            </p>
          )}
          {!rules.data.relationships.length && (
            <p>No relationship rules yet.</p>
          )}
          {rules.data.relationships.map((r) => {
            const counts = rules.data.previews["relation:" + r.name]?.rows[0];
            return (
              <div key={r.name}>
                <h3>{r.name}</h3>
                <p>
                  {r.fromType}.{r.fromColumn} → {r.toType}.{r.toColumn}
                </p>
                <p className="muted">
                  {r.cardinality || "Existing relationship"} ·{" "}
                  {r.refresh
                    ? "Automatic refresh enabled"
                    : "Updated on publication"}
                  {counts
                    ? ` · Last publication: ${number(Number(counts.matched))}/${number(Number(counts.total))} source records matched`
                    : ""}
                </p>
                {role !== "viewer" && (
                  <button className="button" onClick={() => setEditingRule(r)}>
                    Edit {r.name}
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}
      {editingRule !== undefined && rules.data && (
        <Modal
          title={editingRule ? "Edit relationship rule" : "Define relationship"}
          onClose={() => setEditingRule(undefined)}
        >
          <RelationshipRuleForm
            rules={rules.data}
            initial={editingRule || undefined}
            onDone={() => setEditingRule(undefined)}
          />
        </Modal>
      )}
      {creating && (
        <Modal title="Workspace action" onClose={() => setCreating(false)}>
          <ObjectActionForm types={list} onDone={() => setCreating(false)} />
        </Modal>
      )}
    </>
  );
}
