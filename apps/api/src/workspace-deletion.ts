import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "./config.js";
import { transaction, type Store } from "./store.js";

const DELETE_BATCH_SIZE = 25;

export async function finishWorkspaceDeletion(store: Store, scope: string) {
  const workspace = await store.get(scope, "workspace");
  if (workspace?.kind !== "workspace" || !workspace.data.deletingAt)
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

  const resources = await store.list(scope);
  resources.sort(
    (a, b) => Number(b.kind === "relation") - Number(a.kind === "relation"),
  );
  for (let i = 0; i < resources.length; i += DELETE_BATCH_SIZE) {
    const batch = resources.slice(i, i + DELETE_BATCH_SIZE);
    await transaction(store, scope, async (tx) => {
      for (const resource of batch) tx.delete(resource.id);
    });
  }

  await Promise.all(
    ["datasets", "incoming", "results"].map((directory) =>
      rm(resolve(config.dataDir, directory, scope), {
        recursive: true,
        force: true,
      }),
    ),
  );

  await transaction(store, "global", async (tx) => {
    for (const resource of await tx.list()) {
      if (
        ["member", "token"].includes(resource.kind) &&
        resource.data.workspaceId === scope
      )
        tx.delete(resource.id);
    }
    const reference = await tx.get(scope);
    if (reference?.kind === "workspaceRef") tx.delete(reference.id);
  });
  return true;
}