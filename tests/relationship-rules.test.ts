import { afterEach, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";
import { execute as localExecute } from "../services/executor/src/engine.js";
vi.mock("../apps/api/src/executor.js", () => ({
  execute: vi.fn((job) => localExecute(job)),
}));
import { createApp } from "../apps/api/src/app.js";
import { config } from "../apps/api/src/config.js";
import { ingestRows } from "../apps/api/src/datasets.js";
import { MemoryStore } from "../apps/api/src/store.js";
import { startWorker } from "../apps/api/src/jobs.js";
import {
  queueRelationshipRefresh,
  runRelationshipRefresh,
} from "../apps/api/src/relationship-rules.js";
import type { RelationshipChange } from "../packages/shared/src/index.js";

const fixtures: {
  app: Awaited<ReturnType<typeof createApp>>;
  scope: string;
}[] = [];
afterEach(async () => {
  for (const { app, scope } of fixtures.splice(0)) {
    await app.close();
    for (const dir of ["incoming", "datasets", "results"])
      await rm(resolve(config.dataDir, dir, scope), {
        recursive: true,
        force: true,
      });
  }
});

async function fixture() {
  const store = new MemoryStore(),
    app = await createApp(store);
  const scope: string = (await app.inject("/api/v1/me")).json().workspaces[0]
    .id;
  fixtures.push({ app, scope });
  const base = `/api/v1/workspaces/${scope}`;
  const post = async (path: string, payload: unknown, status = 200) => {
    const r = await app.inject({
      method: "POST",
      url: base + path,
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(payload),
    });
    expect(r.statusCode, r.body).toBe(status);
    return r.json();
  };
  const customers = await ingestRows(store, scope, "Customers", [
    { id: "A", code: "A", group: "shared" },
    { id: "B", code: "B", group: "shared" },
  ]);
  const rows = [
    ...Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      ref: "A",
      group: "shared",
    })),
    { id: "missing", ref: "unknown", group: "shared" },
    { id: "null", ref: null, group: "shared" },
    { id: "empty", ref: "", group: "shared" },
  ];
  const orders = await ingestRows(store, scope, "Orders", rows);
  const bundle = {
    summary: "Customers and orders",
    assumptions: ["Preserve business meaning"],
    catalog: [],
    pipelines: [],
    dashboards: [],
    actions: [{ name: "Edit order", objectType: "Order", fields: ["ref"] }],
    ontology: [
      {
        name: "Customer",
        datasetId: customers.id,
        primaryKey: "id",
        properties: ["id", "code", "group"],
      },
      {
        name: "Order",
        datasetId: orders.id,
        primaryKey: "id",
        properties: ["id", "ref", "group"],
      },
    ],
    relationships: [],
  };
  const p = (
    await post("/definitions/import", { version: 1, proposals: [bundle] })
  ).items[0];
  await post(`/proposals/${p.id}/publish`, { hash: p.data.hash });
  const change: RelationshipChange = {
    operation: "upsert",
    relationship: {
      name: "Placed by",
      fromType: "Order",
      toType: "Customer",
      fromColumn: "ref",
      toColumn: "code",
      cardinality: "many-to-one",
      refresh: true,
    },
  };
  const preview = (input: RelationshipChange = change, status = 200) =>
    post("/ontology/relationships/preview", input, status);
  const publish = (draft: { id: string; hash: string }, status = 200) =>
    post(`/proposals/${draft.id}/publish`, { hash: draft.hash }, status);
  const generation = async () =>
    (await store.get(scope, "workspace"))!.data.activeGeneration;
  const relations = async () => {
    const active = await generation();
    return (await store.list(scope, "relation")).filter(
      (r) => r.data.generation === active,
    );
  };
  return {
    app,
    store,
    scope,
    base,
    post,
    rows,
    orders,
    customers,
    change,
    preview,
    publish,
    generation,
    relations,
  };
}

it("previews the complete input, publishes every matching pair and preserves unrelated definitions", async () => {
  const f = await fixture(),
    before = await f.generation();
  const p = await f.preview();
  expect(p.valid, JSON.stringify(p.checks)).toBe(true);
  expect(p.preview.rows).toEqual([
    {
      total: 103,
      matched: 100,
      pairs: 100,
      empty: 2,
      unmatched: 1,
      ambiguous: 0,
      duplicateSources: 1,
    },
  ]);
  expect(p.preview.matches).toHaveLength(10);
  expect(
    p.preview.unmatched.map((r: { from_key: string }) => r.from_key).sort(),
  ).toEqual(["empty", "missing", "null"]);
  expect(await f.generation()).toBe(before);
  expect(await f.relations()).toHaveLength(0);
  await f.publish(p);
  expect(await f.relations()).toHaveLength(100);
  const active = await f.generation();
  expect(active).not.toBe(before);
  const published = await f.store.get(f.scope, p.id);
  expect(published!.data.bundle.actions).toHaveLength(1);
  expect(published!.data.bundle.assumptions).toEqual([
    "Preserve business meaning",
  ]);
  const inventory = (
    await f.app.inject(f.base + "/ontology/relationships")
  ).json();
  expect(inventory.generation).toBe(active);
  expect(inventory.relationships[0]).toEqual(
    f.change.operation === "upsert" ? f.change.relationship : null,
  );
  expect(
    inventory.types
      .find((t: { name: string }) => t.name === "Order")
      .columns.map((c: { name: string }) => c.name),
  ).toContain("ref");
  await f.publish(p); // A repeated publish cannot duplicate links.
  expect(await f.relations()).toHaveLength(100);
});

it("blocks ambiguous targets and invalid one-to-one mappings without changing the graph", async () => {
  const f = await fixture();
  if (f.change.operation !== "upsert") throw new Error("Expected upsert");
  const before = await f.generation();
  const ambiguous = await f.preview({
    ...f.change,
    relationship: {
      ...f.change.relationship,
      fromColumn: "group",
      toColumn: "group",
    },
  });
  expect(ambiguous.valid).toBe(false);
  expect(ambiguous.preview.rows[0].ambiguous).toBe(103);
  expect(
    ambiguous.checks.some((c: { detail: string }) =>
      c.detail.includes("Ambiguous matches"),
    ),
  ).toBe(true);
  await f.publish(ambiguous, 400);
  const oneToOne = await f.preview({
    ...f.change,
    relationship: { ...f.change.relationship, cardinality: "one-to-one" },
  });
  expect(oneToOne.valid).toBe(false);
  expect(
    oneToOne.checks.some((c: { detail: string }) =>
      c.detail.includes("One-to-one requires"),
    ),
  ).toBe(true);
  const unknown = await f.preview({
    ...f.change,
    relationship: { ...f.change.relationship, toColumn: "not_a_column" },
  });
  expect(unknown.valid).toBe(false);
  expect(await f.generation()).toBe(before);
});

it("supports editing, name collision protection and rule removal without deleting records", async () => {
  const f = await fixture();
  await f.publish(await f.preview());
  await f.preview(f.change, 409);
  if (f.change.operation !== "upsert") throw new Error("Expected upsert");
  const edited = await f.preview({
    ...f.change,
    previousName: "Placed by",
    relationship: {
      ...f.change.relationship,
      name: "Customer for",
      refresh: false,
    },
  });
  await f.publish(edited);
  expect(new Set((await f.relations()).map((r) => r.name))).toEqual(
    new Set(["Customer for"]),
  );
  const removed = await f.preview({
    operation: "remove",
    previousName: "Customer for",
  });
  await f.publish(removed);
  expect(await f.relations()).toHaveLength(0);
  const active = await f.generation();
  expect(
    (await f.store.list(f.scope, "object")).filter(
      (r) => r.data.generation === active,
    ),
  ).toHaveLength(105);
  await f.preview({ operation: "remove", previousName: "missing" }, 404);
});

it("rejects stale input and definition previews and read-only or cross-workspace writes", async () => {
  const f = await fixture(),
    p = await f.preview();
  await ingestRows(
    f.store,
    f.scope,
    "Orders",
    [...f.rows, { id: "new", ref: "B", group: "shared" }],
    undefined,
    f.orders.id,
  );
  expect((await f.publish(p, 409)).error).toContain("Input data changed");
  const stale = await f.preview(),
    next = await f.preview();
  await f.publish(next);
  expect((await f.publish(stale, 409)).error).toContain(
    "Published definitions changed",
  );
  const token = await f.post("/tokens", { name: "Read only", readOnly: true });
  const denied = await f.app.inject({
    method: "POST",
    url: f.base + "/ontology/relationships/preview",
    headers: { authorization: `Bearer ${token.token}` },
    payload: f.change,
  });
  expect(denied.statusCode).toBe(403);
  const read = await f.app.inject({
    url: f.base + "/ontology/relationships",
    headers: { authorization: `Bearer ${token.token}` },
  });
  expect(read.statusCode).toBe(200);
  const other = await f.app.inject({
    method: "POST",
    url: "/api/v1/workspaces/another-workspace/ontology/relationships/preview",
    headers: { authorization: `Bearer ${token.token}` },
    payload: f.change,
  });
  expect(other.statusCode).toBe(404);
});

it("refreshes from a durable worker job, coalesces updates and preserves manual overrides", async () => {
  const f = await fixture();
  await f.publish(await f.preview());
  const activeGeneration = await f.generation();
  const objects = (await f.store.list(f.scope, "object")).filter(
    (r) => r.data.generation === activeGeneration,
  );
  const source = objects.find((r) => r.name === "Order 0")!;
  const target = objects.find((r) => r.name === "Customer A")!;
  const unlink = await f.post("/actions/change/preview", {
    operation: "unlink",
    name: "Placed by",
    from: source.id,
    to: target.id,
  });
  await f.post("/actions/change/execute", {
    action: unlink.action,
    hash: unlink.hash,
    idempotencyKey: "unlink-once",
  });
  const before = await f.generation();
  await ingestRows(
    f.store,
    f.scope,
    "Orders",
    [...f.rows, { id: "new", ref: "B", group: "shared" }],
    undefined,
    f.orders.id,
  );
  await queueRelationshipRefresh(f.store, f.scope);
  await queueRelationshipRefresh(f.store, f.scope);
  expect(
    (await f.store.list(f.scope, "job")).filter(
      (j) => j.data.type === "relationship_refresh",
    ),
  ).toHaveLength(1);
  const stop = startWorker(f.store);
  try {
    await vi.waitFor(
      async () => {
        const jobs = (await f.store.list(f.scope, "job")).filter(
          (j) => j.data.type === "relationship_refresh",
        );
        expect(jobs[0].data.status, jobs[0].data.error).toBe("succeeded");
      },
      { timeout: 20000, interval: 100 },
    );
  } finally {
    await stop();
  }
  expect(await f.generation()).not.toBe(before);
  expect(await f.relations()).toHaveLength(100);
  const active = await f.generation();
  expect(
    (await f.relations()).some(
      (r) => r.data.from === active + "_" + source.data.logicalId,
    ),
  ).toBe(false);
  await queueRelationshipRefresh(f.store, f.scope);
  expect(
    (await f.store.list(f.scope, "job")).filter(
      (j) => j.data.type === "relationship_refresh",
    ),
  ).toHaveLength(1);
});

it("retains the previous graph when refresh cardinality validation fails", async () => {
  const f = await fixture();
  await f.publish(await f.preview());
  const before = await f.generation();
  await ingestRows(
    f.store,
    f.scope,
    "Customers",
    [
      { id: "A", code: "A", group: "shared" },
      { id: "B", code: "A", group: "shared" },
    ],
    undefined,
    f.customers.id,
  );
  await queueRelationshipRefresh(f.store, f.scope);
  const jobs = (await f.store.list(f.scope, "job")).filter(
    (j) => j.data.type === "relationship_refresh",
  );
  await expect(
    runRelationshipRefresh(f.store, f.scope, jobs[0]),
  ).rejects.toThrow("Ambiguous matches");
  expect(await f.generation()).toBe(before);
  expect(await f.relations()).toHaveLength(100);
});

it("publishes exactly 99000 matching links from 100000 source records", async () => {
  const f = await fixture();
  await ingestRows(
    f.store,
    f.scope,
    "Orders",
    Array.from({ length: 100000 }, (_, i) => ({
      id: String(i),
      ref: i < 99000 ? (i % 2 ? "A" : "B") : i < 99500 ? "missing" : null,
      group: "shared",
    })),
    undefined,
    f.orders.id,
  );
  const p = await f.preview();
  expect(p.valid, JSON.stringify(p.checks)).toBe(true);
  expect(p.preview.rows[0]).toMatchObject({
    total: 100000,
    matched: 99000,
    pairs: 99000,
    empty: 500,
    unmatched: 500,
    ambiguous: 0,
  });
  await f.publish(p);
  expect(await f.relations()).toHaveLength(99000);
});

it("validates one-to-one rules and excludes empty matches consistently from publication and exploration", async () => {
  const f = await fixture();
  await ingestRows(
    f.store,
    f.scope,
    "Customers",
    [
      { id: "A", code: "A", group: "shared" },
      { id: "B", code: "B", group: "shared" },
      { id: "empty-target", code: "", group: "shared" },
    ],
    undefined,
    f.customers.id,
  );
  await ingestRows(
    f.store,
    f.scope,
    "Orders",
    [
      { id: "1", ref: "A", group: "shared" },
      { id: "2", ref: "B", group: "shared" },
      { id: "empty-source", ref: "", group: "shared" },
    ],
    undefined,
    f.orders.id,
  );
  if (f.change.operation !== "upsert") throw new Error("Expected upsert");
  const p = await f.preview({
    ...f.change,
    relationship: {
      ...f.change.relationship,
      cardinality: "one-to-one",
      refresh: false,
    },
  });
  expect(p.valid, JSON.stringify(p.checks)).toBe(true);
  expect(p.preview.rows[0]).toMatchObject({
    total: 3,
    matched: 2,
    empty: 1,
    pairs: 2,
  });
  await f.publish(p);
  expect(await f.relations()).toHaveLength(2);
  const graph = (await f.app.inject(f.base + "/graph")).json();
  expect(graph.edges).toHaveLength(2);
  const records = (
    await f.app.inject(
      f.base + "/resources/object?type=Order&sort=links&dir=desc",
    )
  ).json();
  expect(
    records.items.find((r: { name: string }) => r.name === "Order empty-source")
      .data.links,
  ).toBe(0);
  await ingestRows(
    f.store,
    f.scope,
    "Orders",
    [{ id: "1", ref: "B", group: "shared" }],
    undefined,
    f.orders.id,
  );
  await queueRelationshipRefresh(f.store, f.scope);
  expect(
    (await f.store.list(f.scope, "job")).filter(
      (j) => j.data.type === "relationship_refresh",
    ),
  ).toHaveLength(0);
});

it("resumes a refresh publication once after worker interruption without creating a second generation", async () => {
  const f = await fixture();
  await f.publish(await f.preview());
  await ingestRows(
    f.store,
    f.scope,
    "Orders",
    [...f.rows, { id: "new", ref: "B", group: "shared" }],
    undefined,
    f.orders.id,
  );
  await queueRelationshipRefresh(f.store, f.scope);
  const job = (await f.store.list(f.scope, "job")).find(
    (j) => j.data.type === "relationship_refresh",
  )!;
  await runRelationshipRefresh(f.store, f.scope, job);
  const active = await f.generation();
  await runRelationshipRefresh(f.store, f.scope, job);
  expect(await f.generation()).toBe(active);
  expect(await f.relations()).toHaveLength(101);
});
