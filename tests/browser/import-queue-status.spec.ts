import { test, expect } from "@playwright/test";
import { api, openApp } from "./support/workspace";

test("setup distinguishes queued imports from running imports and exposes progress", async ({
  page,
}) => {
  await openApp(page);
  const workspace = await api(page, "/workspaces", {
    name: "Import queue status",
  });
  const base = `/api/v1/workspaces/${workspace.id}`;
  let status = "queued";
  let importCount = 1;
  await page.route(`**${base}/onboarding`, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const state = await response.json();
    const timestamp = new Date().toISOString();
    const source = {
      id: "fixture-source",
      workspaceId: workspace.id,
      kind: "source",
      name: "MySQL orders",
      description: "",
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      data: { kind: "mysql", connectionId: "fixture-connection" },
    };
    const job = {
      ...source,
      id: "fixture-import",
      kind: "job",
      name: "Import orders",
      data: { type: "sync", sourceId: source.id, status },
    };
    await route.fulfill({
      json: {
        ...state,
        step: "data",
        sources: [source],
        datasets: [],
        imports: Array.from({ length: importCount }, (_, index) => ({
          ...job,
          id: job.id + index,
          data: {
            ...job.data,
            status: index > 0 && status === "running" ? "queued" : status,
          },
        })),
        dataReady: false,
        blockers: ["Import is still in progress."],
      },
    });
  });
  await page.evaluate(
    (id) => localStorage.setItem("foundry.workspace", id),
    workspace.id,
  );
  await page.goto("/onboarding");
  await expect(
    page.getByText("1 import is queued, waiting for the worker.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "View import progress" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Import orders", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("queued", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Cancel|Stop/i }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  importCount = 2;
  await expect(
    page.getByText("2 imports are queued, waiting for the worker.", {
      exact: false,
    }),
  ).toBeVisible();
  status = "running";
  await expect(
    page.getByText("Importing your data (1 running, 1 queued).", {
      exact: false,
    }),
  ).toBeVisible();
  status = "failed";
  await expect(
    page.getByText("A source needs attention.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /Retry/i }),
  ).toHaveCount(2);
});
