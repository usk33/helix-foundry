import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "../apps/api/src/config.js";
import { MemoryStore, resource, transaction } from "../apps/api/src/store.js";
import { finishWorkspaceDeletion } from "../apps/api/src/workspace-deletion.js";

const previousDataDir = config.dataDir;
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "foundry-deletion-"));
  config.dataDir = directory;
});
afterEach(async () => {
  config.dataDir = previousDataDir;
  await rm(directory, { recursive: true, force: true });
  vi.restoreAllMocks();
});

async function marked(store: MemoryStore, scope = "deleting") {
  await transaction(store, "global", async (tx) => {
    tx.put(resource("global", "workspaceRef", scope, { deletingAt: 1 }, scope));
    tx.put(
      resource("global", "member", "Owner", { workspaceId: scope }, "member"),
    );
    tx.put(
      resource("global", "token", "Token", { workspaceId: scope }, "token"),
    );
    tx.put(
      resource("global", "token", "Keep", { workspaceId: "other" }, "keep"),
    );
  });
  await transaction(store, scope, async (tx) => {
    tx.put(resource(scope, "workspace", scope, { deletingAt: 1 }, "workspace"));
  });
}

it("drains 100,000 records in bounded resumable slices, relations before objects", async () => {
  const store = new MemoryStore();
  await marked(store);
  await transaction(store, "deleting", async (tx) => {
    for (let i = 0; i < 100_000; i++)
      tx.put(resource("deleting", "object", "Record", {}, "o" + i));
    for (let i = 0; i < 250; i++)
      tx.put(
        resource(
          "deleting",
          "relation",
          "Link",
          { from: "o0", to: "o1" },
          "r" + i,
        ),
      );
  });
  const list = store.list.bind(store);
  vi.spyOn(store, "list").mockImplementation((scope, kind) => {
    if (scope === "deleting" && !kind) throw new Error("Unbounded read");
    return list(scope, kind);
  });
  const keys = vi.spyOn(store, "deletionKeys");
  const commit = store.commit.bind(store);
  const deleted: string[] = [];
  vi.spyOn(store, "commit").mockImplementation(
    async (scope, version, changes) => {
      if (scope === "deleting") {
        expect(changes.length).toBeLessThanOrEqual(100);
        deleted.push(
          ...changes.flatMap((c) => ("delete" in c ? [c.delete] : [])),
        );
      }
      return commit(scope, version, changes);
    },
  );
  expect(await finishWorkspaceDeletion(store, "deleting")).toBe(false);
  expect(deleted.length).toBeGreaterThan(0);
  expect(deleted.length).toBeLessThanOrEqual(1000);
  expect(deleted.slice(0, 250).every((id) => id.startsWith("r"))).toBe(true);
  expect(await store.get("deleting", "workspace")).toBeDefined();
  const progress = (await store.get("global", "deleting"))?.data.deletion;
  expect(progress.removed).toBe(deleted.length);
  let slices = 1;
  while (!(await finishWorkspaceDeletion(store, "deleting"))) {
    expect(++slices).toBeLessThan(1100);
  }
  expect(deleted).toHaveLength(100_251);
  expect(new Set(deleted).size).toBe(deleted.length);
  expect(deleted.at(-1)).toBe("workspace");
  expect(await list("deleting")).toEqual([]);
  expect(await store.get("global", "deleting")).toBeUndefined();
  expect(await store.get("global", "member")).toBeUndefined();
  expect(await store.get("global", "token")).toBeUndefined();
  expect(await store.get("global", "keep")).toBeDefined();
  expect(keys.mock.calls.every(([, , limit]) => limit === 100)).toBe(true);
}, 30_000);

it("recovers a missing workspace marker using the global deletion reference", async () => {
  const store = new MemoryStore();
  await marked(store);
  await transaction(store, "deleting", async (tx) => {
    tx.delete("workspace");
    tx.put(resource("deleting", "object", "Orphan", {}, "object"));
  });
  const path = join(directory, "datasets", "deleting");
  await mkdir(path, { recursive: true });
  await writeFile(join(path, "data"), "fixture");
  expect(await finishWorkspaceDeletion(store, "deleting")).toBe(true);
  expect(await store.list("deleting")).toEqual([]);
  expect(await store.get("global", "deleting")).toBeUndefined();
  await expect(access(path)).rejects.toMatchObject({ code: "ENOENT" });
});

it("retains markers after a failed batch and resumes without skipping records", async () => {
  const store = new MemoryStore();
  await marked(store);
  await transaction(store, "deleting", async (tx) => {
    for (let i = 0; i < 250; i++)
      tx.put(resource("deleting", "object", "Record", {}, "o" + i));
  });
  const commit = store.commit.bind(store);
  let batches = 0;
  vi.spyOn(store, "commit").mockImplementation((scope, version, changes) => {
    if (scope === "deleting" && ++batches === 2)
      throw new Error("Interrupted deletion");
    return commit(scope, version, changes);
  });
  await expect(finishWorkspaceDeletion(store, "deleting")).rejects.toThrow(
    "Interrupted deletion",
  );
  expect(await store.get("deleting", "workspace")).toBeDefined();
  expect(await store.get("global", "deleting")).toBeDefined();
  expect(await finishWorkspaceDeletion(store, "deleting")).toBe(true);
  expect(await store.list("deleting")).toEqual([]);
});

it("does not delete an unmarked workspace even if its workspace record is missing", async () => {
  const store = new MemoryStore();
  await transaction(store, "global", async (tx) =>
    tx.put(resource("global", "workspaceRef", "Keep", {}, "keep")),
  );
  await transaction(store, "keep", async (tx) =>
    tx.put(resource("keep", "object", "Keep", {}, "object")),
  );
  expect(await finishWorkspaceDeletion(store, "keep")).toBe(false);
  expect(await store.get("keep", "object")).toBeDefined();
});
