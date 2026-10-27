import { test, expect } from "@playwright/test";
import { api, openApp } from "./support/workspace";

test("delete workspace requires typed confirmation and switches workspace", async ({
  page,
}) => {
  await openApp(page);
  const remaining = (await api(page, "/me")).workspaces[0];
  const target = await api(page, "/workspaces", {
    name: "Delete me " + Date.now(),
  });
  await page.evaluate(
    (id) => localStorage.setItem("foundry.workspace", id),
    target.id,
  );

  await page.goto("/settings");
  const deleteButton = page.getByRole("button", {
    name: `Delete workspace ${target.name}`,
  });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();

  const dialog = page.getByRole("dialog", {
    name: `Delete “${target.name}”?`,
  });
  const confirm = dialog.getByRole("button", { name: "Delete workspace" });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("textbox").fill(target.name);
  await expect(confirm).toBeEnabled();
  const switched = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
      `/api/v1/workspaces/${remaining.id}/onboarding`,
  );
  await confirm.click();

  await switched;
  expect(
    await page.evaluate(() => localStorage.getItem("foundry.workspace")),
  ).toBe(remaining.id);
  const deleted = await page.request.get(
    `/api/v1/workspaces/${target.id}/overview`,
  );
  expect(deleted.status()).toBe(404);
});