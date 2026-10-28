import { afterEach, expect, it, vi } from "vitest";
import { MemoryStore, resource, transaction } from "../apps/api/src/store.js";

const controls = vi.hoisted(() => ({
  buildWorkspace: vi.fn(),
  reduceStoredDiscovery: vi.fn(),
}));

vi.mock("../apps/api/src/source-sync.js", () => ({
  startChangeStreams: () => async () => {},
  scheduledRefresh: () => false,
  needsChangeRefresh: () => false,
  nextRefresh: () => null,
}));
vi.mock("../apps/api/src/assistant.js", () => ({
  providerSettings: async () => ({ continuous: false }),
  buildWorkspace: controls.buildWorkspace,
  enqueue: vi.fn(),
}));
vi.mock("../apps/api/src/setup-jobs.js", () => ({ prepareProvider: vi.fn() }));
vi.mock("../apps/api/src/data-jobs.js", () => ({
  runSyncJob: vi.fn(),
  runUploadJob: vi.fn(),
}));
vi.mock("../apps/api/src/pipeline-jobs.js", () => ({
  runPipelineJob: vi.fn(),
}));
vi.mock("../apps/api/src/cleanup.js", () => ({
  queueCleanup: vi.fn(),
  runCleanupJob: vi.fn(),
}));
vi.mock("../apps/api/src/results.js", () => ({
  sweepResults: async () => {},
}));
vi.mock("../apps/api/src/source-discovery.js", () => ({
  reduceStoredDiscovery: controls.reduceStoredDiscovery,
}));
vi.mock("../apps/api/src/dataset-samples.js", () => ({
  compactStoredSamples: vi.fn(),
}));
vi.mock("../apps/api/src/workspace-deletion.js", () => ({
  finishWorkspaceDeletion: vi.fn(),
}));
vi.mock("../apps/api/src/relationship-rules.js", () => ({
  queueRelationshipRefresh: vi.fn(),
  runRelationshipRefresh: vi.fn(),
}));

import { startWorker } from "../apps/api/src/jobs.js";

afterEach(() => {
  vi.restoreAllMocks();
  controls.buildWorkspace.mockReset();
  controls.reduceStoredDiscovery.mockReset();
});

it("claims queued runs before starting one-time workspace maintenance", async () => {
  const store = new MemoryStore();
  await transaction(store, "global", async (tx) =>
    tx.put(resource("global", "workspaceRef", "Fixture", {}, "fixture")),
  );
  await transaction(store, "fixture", async (tx) => {
    tx.put(resource("fixture", "workspace", "Fixture", {}, "workspace"));
    tx.put(
      resource(
        "fixture",
        "run",
        "Build workspace",
        { status: "queued", task: "onboarding_build" },
        "run",
      ),
    );
  });

  let releaseMaintenance!: () => void;
  const maintenance = new Promise<void>((resolve) => {
    releaseMaintenance = resolve;
  });
  controls.buildWorkspace.mockResolvedValue(undefined);
  controls.reduceStoredDiscovery.mockImplementation(() => maintenance);

  const stop = startWorker(store);
  try {
    await vi.waitFor(
      async () => {
        expect(controls.buildWorkspace).toHaveBeenCalledTimes(1);
        expect((await store.get("fixture", "run"))?.data.status).toBe(
          "running",
        );
      },
      { timeout: 1000 },
    );
    expect(controls.reduceStoredDiscovery).not.toHaveBeenCalled();
  } finally {
    releaseMaintenance();
    await stop();
  }
});
