import { expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { g, readBatch, SourcePredicate } from "@helix-db/helix-db";
import { config } from "../apps/api/src/config.js";
import { HelixStore, resource, transaction } from "../apps/api/src/store.js";
import { finishWorkspaceDeletion } from "../apps/api/src/workspace-deletion.js";

it.skipIf(process.env.TEST_HELIX !== "1")(
  "deletes real HelixDB documents and native edges with bounded ID-only reads",
  async () => {
    const store = new HelixStore();
    await store.init();
    const scope = "test-deletion-" + randomUUID();
    const previousDataDir = config.dataDir;
    const directory = await mkdtemp(join(tmpdir(), "foundry-helix-deletion-"));
    config.dataDir = directory;
    try {
      await transaction(store, "global", async (tx) =>
        tx.put(
          resource(
            "global",
            "workspaceRef",
            "Delete",
            { deletingAt: 1 },
            scope,
          ),
        ),
      );
      await transaction(store, scope, async (tx) =>
        tx.put(
          resource(
            scope,
            "workspace",
            "Delete",
            { deletingAt: 1 },
            "workspace",
          ),
        ),
      );
      const handles = new Map<string, string>();
      for (let start = 0; start < 1500; start += 100) {
        const batch = Array.from({ length: 100 }, (_, i) =>
          resource(
            scope,
            "object",
            "Large document",
            {
              generation: "fixture",
              payload: "x".repeat(4096),
            },
            "o" + (start + i),
          ),
        );
        for (const [id, handle] of await store.stageObjects(
          scope,
          batch,
          false,
        ))
          handles.set(id, handle);
      }
      for (let start = 0; start < 250; start += 50) {
        await store.stageRelations(
          scope,
          Array.from({ length: 50 }, (_, i) => ({
            relation: resource(
              scope,
              "relation",
              "Links",
              {
                generation: "fixture",
                from: "o0",
                to: "o" + (start + i + 1),
              },
              "r" + (start + i),
            ),
            from: handles.get("o0")!,
            to: handles.get("o" + (start + i + 1))!,
          })),
          false,
        );
      }
      expect((await store.neighbors(scope, "o0")).length).toBe(250);
      const originalRead = store.read.bind(store);
      const responseSizes: number[] = [];
      vi.spyOn(store, "read").mockImplementation(async (...args) => {
        const result = await originalRead(...args);
        responseSizes.push(Buffer.byteLength(JSON.stringify(result)));
        return result;
      });
      const list = store.list.bind(store);
      vi.spyOn(store, "list").mockImplementation((s, kind) => {
        if (s === scope && !kind) throw new Error("Unbounded read");
        return list(s, kind);
      });
      const keys = store.deletionKeys.bind(store);
      vi.spyOn(store, "deletionKeys").mockImplementation(
        async (s, kind, limit) => {
          if (s === scope && !kind)
            expect(await store.neighbors(scope, "o0")).toEqual([]);
          return keys(s, kind, limit);
        },
      );
      expect(await finishWorkspaceDeletion(store, scope)).toBe(false);
      expect(await store.get(scope, "workspace")).toBeDefined();
      expect((await store.neighbors(scope, "o0")).length).toBeLessThan(250);
      let slices = 0;
      while (!(await finishWorkspaceDeletion(store, scope))) {
        expect(++slices).toBeLessThan(100);
      }
      expect(await store.deletionKeys(scope, undefined, 100)).toEqual([]);
      expect(await store.get(scope, "workspace")).toBeUndefined();
      expect(await store.get("global", scope)).toBeUndefined();
      const remainingEdges = await store.read(
        readBatch()
          .varAs(
            "edges",
            g()
              .eWithLabelWhere(
                "FoundryRelationship",
                SourcePredicate.eq("scope", scope),
              )
              .limit(1)
              .valueMap(["relationId"]),
          )
          .returning(["edges"]),
      );
      expect(remainingEdges.edges).toBeNull();
      expect(Math.max(...responseSizes)).toBeLessThan(50_000);
      console.log(
        JSON.stringify({
          fixture: "workspace-deletion",
          records: 1500,
          nativeRelations: 250,
          largestReadBytes: Math.max(...responseSizes),
          peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024),
        }),
      );
    } finally {
      vi.restoreAllMocks();
      // Also cleans an interrupted fixture without touching another scope.
      while (!(await finishWorkspaceDeletion(store, scope))) {
        if (!(await store.get("global", scope))) break;
      }
      config.dataDir = previousDataDir;
      await rm(directory, { recursive: true, force: true });
    }
  },
  120_000,
);
