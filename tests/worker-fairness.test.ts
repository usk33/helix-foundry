import { afterEach, expect, it, vi } from "vitest";
import { MemoryStore, resource, transaction } from "../apps/api/src/store.js";

vi.mock("../apps/api/src/source-sync.js", () => ({
  startChangeStreams: () => async () => {},
  scheduledRefresh: () => false,
  needsChangeRefresh: () => false,
  nextRefresh: () => null,
}));
vi.mock("../apps/api/src/assistant.js", () => ({
  providerSettings: async () => ({ continuous: false }),
  buildWorkspace: vi.fn(),
  enqueue: vi.fn(),
}));
const handlers = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("../apps/api/src/data-jobs.js", () => ({
  runSyncJob: handlers.sync,
  runUploadJob: vi.fn(),
}));
import { startWorker } from "../apps/api/src/jobs.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  handlers.sync.mockReset();
});

it("serves later workspaces despite a continuously runnable earlier backlog, without parallel jobs", async () => {
  vi.useFakeTimers();
  const store = new MemoryStore();
  const order: string[] = [];
  let running = 0;
  handlers.sync.mockImplementation(async (_store, scope) => {
    expect(++running).toBe(1);
    order.push(scope);
    await Promise.resolve();
    running--;
    return { again: true, retryIn: 0 };
  });
  for (const scope of ["first", "second", "third"]) {
    await transaction(store, "global", async (tx) =>
      tx.put(resource("global", "workspaceRef", scope, {}, scope)),
    );
    await transaction(store, scope, async (tx) =>
      tx.put(
        resource(
          scope,
          "job",
          "Scheduled refresh",
          {
            type: "sync",
            status: "queued",
            background: true,
          },
          "job",
        ),
      ),
    );
  }
  const stop = startWorker(store);
  try {
    await vi.advanceTimersByTimeAsync(10_000);
    expect(order.slice(0, 6)).toEqual([
      "first",
      "second",
      "third",
      "first",
      "second",
      "third",
    ]);
  } finally {
    await stop();
  }
});

it("continues safely if the last served workspace disappears, and skips idle workspaces", async () => {
  vi.useFakeTimers();
  const store = new MemoryStore();
  const order: string[] = [];
  handlers.sync.mockImplementation(async (_store, scope) => {
    order.push(scope);
    if (scope === "first")
      await transaction(store, "global", async (tx) => tx.delete("first"));
  });
  for (const scope of ["first", "idle", "third"]) {
    await transaction(store, "global", async (tx) =>
      tx.put(resource("global", "workspaceRef", scope, {}, scope)),
    );
    if (scope !== "idle")
      await transaction(store, scope, async (tx) =>
        tx.put(
          resource(
            scope,
            "job",
            "Import",
            { type: "sync", status: "queued" },
            "job",
          ),
        ),
      );
  }
  const stop = startWorker(store);
  try {
    await vi.advanceTimersByTimeAsync(4000);
    expect(order).toEqual(["first", "third"]);
  } finally {
    await stop();
  }
});
