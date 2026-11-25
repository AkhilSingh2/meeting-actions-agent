import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test("extracts a pasted transcript into a cited record", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The meeting, accounted for." })).toBeVisible();
  await page.getByLabel("Title").fill("Beta notes");
  await page.getByLabel("Meeting date").fill("2026-03-03");
  await page.getByRole("textbox", { name: "Transcript" }).fill(
    "Mina Cole: I'll send the beta checklist by Friday.\nOwen Park: We decided to pause the referral experiment.",
  );
  await page.getByRole("button", { name: "Extract outcomes" }).click();
  await expect(page.getByRole("heading", { name: "Beta notes" })).toBeVisible();
  await expect(page.getByText("Send the beta checklist", { exact: true })).toBeVisible();
  await expect(page.locator(".q-who", { hasText: "Owen Park" })).toBeVisible();
  await page.getByRole("link", { name: /line 1, Mina Cole/ }).click();
  await expect(page.locator("#cue-c1")).toBeFocused();
});

test("opens a sample, edits the owner, and keeps the edit", async ({ page }) => {
  await page.goto("/meetings/northline-critique");
  await expect(page.getByRole("heading", { name: "Northline critique" })).toBeVisible();
  await page.getByRole("link", { name: /03:18, line 3, Sam Okonkwo/ }).click();
  await expect(page.locator("#cue-c3")).toBeFocused();
  await page.getByRole("button", { name: "Edit record" }).click();
  const owner = page.getByLabel("Owner for Ship the feature flag for the short flow");
  await owner.fill("Alex Rivera");
  await page.reload();
  await expect(page.getByText("Alex Rivera").first()).toBeVisible();
});

test("previews a Jira payload without sending it", async ({ page }) => {
  await page.goto("/meetings/northline-critique");
  await page.getByRole("button", { name: "Export" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: "Jira" }).check();
  const dryRun = dialog.locator("p.q-note", { hasText: "Demo mode stops before the network." });
  await expect(dryRun.first()).toBeVisible();
  await expect(dialog.getByLabel("Request preview")).toContainText("/rest/api/3/issue");
  let leaked = false;
  page.on("request", (request) => {
    if (request.url().includes("atlassian.net") || request.url().includes("api.linear.app")) leaked = true;
  });
  await dialog.getByRole("button", { name: "Send live" }).click();
  await expect(dryRun.first()).toBeVisible();
  expect(leaked).toBe(false);
});

test("downloads markdown", async ({ page }) => {
  await page.goto("/meetings/harbor-reliability");
  await page.getByRole("button", { name: "Export" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Markdown" }).check();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("button", { name: "Download Markdown" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("harbor-reliability.md");
});

test("tracks status from the history view", async ({ page }) => {
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Open commitments" })).toBeVisible();
  const status = page.getByLabel("Status for Ship the feature flag for the short flow");
  await status.selectOption("done");
  await page.getByRole("button", { name: "Done", pressed: false }).click();
  await expect(page.getByRole("heading", { name: "Ship the feature flag for the short flow" })).toBeVisible();
});

test("toggles and remembers the color theme", async ({ page }) => {
  await page.goto("/");
  const before = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: /theme/i }).click();
  const after = before === "dark" ? "light" : "dark";
  await expect(page.locator("html")).toHaveAttribute("data-theme", after);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", after);
});

test("has no serious accessibility violations on the main screens", async ({ page }) => {
  await page.goto("/");
  await expectNoSeriousViolations(page);
  await page.goto("/meetings/northline-critique");
  await expect(page.getByRole("heading", { name: "Northline critique" })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Open work, across meetings." })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.goto("/evals");
  await expectNoSeriousViolations(page);
});

test("fits a phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Extract outcomes" })).toBeVisible();
  expect(await overflows(page)).toBe(false);
  await page.goto("/meetings/field-notes");
  await expect(page.getByRole("heading", { name: "Field notes" })).toBeVisible();
  expect(await overflows(page)).toBe(false);
});

async function overflows(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}
