import { expect, test } from "@playwright/test";
import { api, openApp } from "./support/workspace";

test("define, preview, publish, refresh, edit and remove an ontology relationship rule", async ({
  page,
}, testInfo) => {
  await openApp(page);
  const ws = await api(page, "/workspaces", {
    name: "Relationship acceptance " + Date.now(),
  });
  const base = `/workspaces/${ws.id}`;
  const customers = await api(page, base + "/ingest", {
    name: "Customers",
    rows: [{ id: "A" }, { id: "B" }],
  });
  const orders = await api(page, base + "/ingest", {
    name: "Orders",
    rows: [
      { id: "1", customer: "A" },
      { id: "2", customer: "A" },
      { id: "3", customer: "missing" },
    ],
  });
  const p = (
    await api(page, base + "/definitions/import", {
      version: 1,
      proposals: [
        {
          summary: "Orders and customers",
          assumptions: [],
          catalog: [],
          pipelines: [],
          ontology: [
            {
              name: "Order",
              datasetId: orders.id,
              primaryKey: "id",
              properties: ["id", "customer"],
            },
            {
              name: "Customer",
              datasetId: customers.id,
              primaryKey: "id",
              properties: ["id"],
            },
          ],
          relationships: [],
          dashboards: [
            {
              name: "Overview",
              widgets: [
                {
                  title: "Orders",
                  type: "metric",
                  inputs: [orders.id],
                  sql: `SELECT count(*) AS total FROM ${orders.data.table}`,
                },
              ],
            },
          ],
          actions: [],
        },
      ],
    })
  ).items[0];
  await api(page, base + `/proposals/${p.id}/publish`, { hash: p.data.hash });
  await page.evaluate(
    (id) => localStorage.setItem("foundry.workspace", id),
    ws.id,
  );
  await page.goto("/ontology");
  await page
    .getByRole("button", { name: "Define relationship", exact: true })
    .click();
  let dialog = page.getByRole("dialog", {
    name: "Define relationship",
    exact: true,
  });
  await dialog
    .getByLabel("Relationship name", { exact: true })
    .fill("Placed by");
  await dialog
    .getByRole("combobox", { name: "From entity", exact: true })
    .selectOption("Order");
  await dialog
    .getByRole("combobox", { name: "To entity", exact: true })
    .selectOption("Customer");
  await dialog
    .getByRole("combobox", { name: "From matching field", exact: true })
    .selectOption("customer");
  await dialog
    .getByRole("combobox", { name: "To matching field", exact: true })
    .selectOption("id");
  await dialog
    .getByRole("combobox", { name: "Expected relationship", exact: true })
    .selectOption("one-to-one");
  await dialog
    .getByRole("button", { name: "Preview relationship", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("One-to-one requires");
  await expect(
    dialog.getByRole("button", { name: "Publish relationship", exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("combobox", { name: "Expected relationship", exact: true })
    .selectOption("many-to-one");
  await expect(
    dialog.getByRole("region", { name: "Relationship preview" }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Preview relationship", exact: true })
    .click();
  const preview = dialog.getByRole("region", { name: "Relationship preview" });
  await expect(preview).toContainText("3 source records checked");
  await expect(preview).toContainText("2 source records matched");
  await expect(preview).toContainText("1 non-empty fields without a match");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("relationship-preview-mobile.png"),
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "Publish relationship", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const rules = page.getByRole("region", { name: "Relationship rules" });
  await expect(rules).toContainText("2/3 source records matched");
  const graph = await api(page, base + "/graph");
  expect(
    graph.edges.filter((e: { name: string }) => e.name === "Placed by"),
  ).toHaveLength(2);
  await api(page, base + "/ingest", {
    name: "Orders",
    datasetId: orders.id,
    rows: [
      { id: "1", customer: "A" },
      { id: "2", customer: "B" },
      { id: "3", customer: "B" },
    ],
  });
  await expect
    .poll(
      async () => {
        const graph = await api(page, base + "/graph");
        return graph.edges.filter(
          (e: { name: string }) => e.name === "Placed by",
        ).length;
      },
      { timeout: 30000 },
    )
    .toBe(3);
  await page.reload();
  await page
    .getByRole("button", { name: "Edit Placed by", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Edit relationship rule",
    exact: true,
  });
  await dialog
    .getByLabel("Relationship name", { exact: true })
    .fill("Customer for");
  await dialog
    .getByRole("button", { name: "Preview relationship", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Publish relationship", exact: true })
    .click();
  await expect(rules).toContainText("Customer for");
  await page
    .getByRole("button", { name: "Edit Customer for", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Remove rule", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Preview removal", exact: true })
    .click();
  await expect(dialog).toContainText("Records and other definitions are kept");
  await dialog
    .getByRole("button", { name: "Publish removal", exact: true })
    .click();
  await expect(rules).toContainText("No relationship rules yet");
  expect((await api(page, base + "/graph")).edges).toHaveLength(0);
});
