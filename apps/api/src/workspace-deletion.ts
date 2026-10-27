import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "./config.js";
import { transaction, type Store } from "./store.js";

const DELETE_BATCH_SIZE = 100;
const DELETE_SLICE_MS = 1000;
const MAX_BATCHES = 10;

export async function finishWorkspaceDeletion(store: Store, scope: string) {
  const workspace = await store.get(scope, "workspace");
  const reference = await store.get("global", scope);
  if (
    !(workspace?.kind === "workspace" && workspace.data.deletingAt) &&
    !(reference?.kind === "workspaceRef" && reference.data.deletingAt)
  )
    return false;
  const now = Date.now();
  const active = [
    ...(await store.list(scope, "job")),
    ...(await store.list(scope, "run")),
  ].some((resource) => {
    if (resource.data.status !== "running") return false;
    const leaseUntil = Number(resource.data.leaseUntil);
    return !Number.isFinite(leaseUntil) || leaseUntil > now;
  });
  if (active) return false;

  let removed = 0;
  const started = Date.now();
  for (let batch = 0; ; batch++) {
    if (
      batch >= MAX_BATCHES ||
      (batch > 0 && Date.now() - started >= DELETE_SLICE_MS)
    ) {
      await transaction(store, "global", async (tx) => {
        const ref = await tx.get(scope);
        if (ref?.kind === "workspaceRef")
          tx.update(ref, {
            ...ref.data,
            deletion: {
              removed: (ref.data.deletion?.removed || 0) + removed,
              updatedAt: Date.now(),
              error: null,
            },
          });
      });
      return false;
    }
    // Native edges must go before their endpoints. Reads contain only a
    // bounded set of keys, never all workspace documents or a total count.
    let ids = await store.deletionKeys(scope, "relation", DELETE_BATCH_SIZE);
    if (!ids.length)
      ids = await store.deletionKeys(scope, undefined, DELETE_BATCH_SIZE);
    if (!ids.length) break;
    await transaction(store, scope, async (tx) => {
      for (const id of ids) tx.delete(id);
    });
    removed += ids.length;
  }

  await Promise.all(
    ["datasets", "incoming", "results"].map((directory) =>
      rm(resolve(config.dataDir, directory, scope), {
        recursive: true,
        force: true,
      }),
    ),
  );

  await transaction(store, scope, async (tx) => {
    tx.delete("workspace");
  });
  await transaction(store, "global", async (tx) => {
    for (const kind of ["member", "token"])
      for (const resource of await tx.list(kind))
        if (resource.data.workspaceId === scope) tx.delete(resource.id);
    const reference = await tx.get(scope);
    if (reference?.kind === "workspaceRef") tx.delete(reference.id);
  });
  return true;
}
