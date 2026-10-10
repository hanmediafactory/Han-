import { test, expect } from "@playwright/test";
for (const [width, height] of [
  [390, 844],
  [375, 812],
  [393, 852],
  [430, 932],
  [360, 800],
]) {
  test(`Owner workflow ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Who are you?" }),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Harsha Owner / Admin" }).click();
    await expect(
      page.getByRole("radio", { name: "Harsha Owner / Admin" }),
    ).toHaveAttribute("aria-checked", "true");
    await page
      .getByLabel(/Account Password/)
      .fill("test-only-password-123456");
    await page.getByRole("button", { name: "Enter HAN" }).click();
    await expect(page.getByRole("heading", { name: "Welcome back, Harsha." })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Welcome back, Harsha." })).toBeVisible();
    await expect(page.locator(".han-app")).toHaveCSS(
      "font-family",
      /Inter|system-ui/,
    );
    await expect(page.locator(".han-app > div > div").first()).toHaveCSS(
      "padding-left",
      "20px",
    );
    await page.screenshot({ path: `test-results/han-home-${width}.png` });
    await page.getByRole("button", { name: "Work", exact: true }).click();
    await page.getByRole("button", { name: /^Add (project|task|funnel|lead|event)$/ }).click();
    await page
      .getByLabel("Project name", { exact: true })
      .fill(`Mobile project ${width}`);
    await page.getByLabel("Deadline (optional)", { exact: true }).fill("2026-10-12");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByText(`Mobile project ${width}`, { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "View tasks" }).click();
    await page.getByRole("button", { name: /^Add (project|task|funnel|lead|event)$/ }).click();
    await page.getByLabel("Task title").fill(`Mobile task ${width}`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: `Mobile task ${width}`, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark complete" }).first().click();
    await expect(
      page.getByRole("button", { name: "Mark pending" }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Money", exact: true }).click();
    await page.getByRole("button", { name: "Add income", exact: true }).click();
    await page.getByLabel("Title", { exact: true }).fill(`Payment ${width}`);
    await page.getByLabel("Amount (₹)").fill("1234.50");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByText(`Payment ${width}`, { exact: true }),
    ).toBeVisible();
    for (const name of ["Home", "Work", "Growth", "You"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect(page.locator(".bottom-nav-bar")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
    await page.screenshot({ path: `test-results/han-${width}.png` });
    await page
      .getByRole("button", { name: "Sign out / switch identity" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Who are you?" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test("Member task controls, transparent finance and restricted management", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("radio", { name: "Nihaal Team Member" }).click();
  await page
    .getByLabel(/Account Password/)
    .fill("test-only-password-123456");
  await page.getByRole("button", { name: "Enter HAN" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Nihaal." })).toBeVisible();
  await page.getByRole("button", { name: "Money", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Funds and shared financial ledger" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add income", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add expense", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record salary", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Add (project|task|funnel|lead|event)$/ })).toHaveCount(0);
  await expect(page.getByText("Reviewly", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Lalitha Birthday Website", { exact: true }),
  ).toHaveCount(0);
});
test("Owner manages funnels, leads, calendar and cross-session task updates", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("radio", { name: "Harsha Owner / Admin" }).click();
  await page
    .getByLabel(/Account Password/)
    .fill("test-only-password-123456");
  await page.getByRole("button", { name: "Enter HAN" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Harsha." })).toBeVisible();
  await page.getByRole("button", { name: "Growth", exact: true }).click();
  await page.getByRole("button", { name: /^Add (project|task|funnel|lead|event)$/ }).click();
  await page.getByLabel("Funnel title").fill("Launch pipeline");
  await page.getByRole("button", { name: "Add step" }).click();
  await page.getByLabel("Step 1 title").fill("Contact clients");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Launch pipeline", { exact: true }).click();
  await page.getByRole("button", { name: "Pending", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "In Progress", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "In Progress", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Completed", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Growth", exact: true }).click();
  await page.getByRole("button", { name: "Manage leads" }).click();
  await page.getByRole("button", { name: /^Add (project|task|funnel|lead|event)$/ }).click();
  await page.getByLabel("Lead name").fill("Real client");
  await page.getByLabel("Category", { exact: true }).selectOption("General");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Real client", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page.getByLabel("Status", { exact: true }).selectOption("Interested");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Status for Real client" })).toHaveValue("Interested");
  await page
    .getByRole("button", { name: "Delete", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Real client", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "You", exact: true }).click();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await page.getByRole("button", { name: /^Add (project|task|funnel|lead|event)$/ }).click();
  await page.getByLabel("Event title").fill("Team planning");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Team planning", { exact: true })).toBeVisible();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const memberPage = await context.newPage();
  await memberPage.goto("http://127.0.0.1:3101");
  await memberPage.getByRole("radio", { name: "Nihaal Team Member" }).click();
  await memberPage
    .getByLabel(/Account Password/)
    .fill("test-only-password-123456");
  await memberPage.getByRole("button", { name: "Enter HAN" }).click();
  await expect(
    memberPage.getByRole("heading", { name: "Welcome back, Nihaal." }),
  ).toBeVisible();
  await memberPage.getByRole("button", { name: "Work", exact: true }).click();
  await memberPage.getByRole("button", { name: "View tasks" }).click();
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await page.getByRole("button", { name: "View tasks" }).click();
  await page.getByRole("button", { name: /^Add (project|task|funnel|lead|event)$/ }).click();
  await page.getByLabel("Task title").fill("Shared assignment");
  await page.getByLabel("Assigned user").selectOption("user-2");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    memberPage.getByRole("heading", { name: "Shared assignment", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  const row = memberPage
    .locator(".han-card")
    .filter({ hasText: "Shared assignment" });
  await row.getByRole("button", { name: "Mark complete" }).click();
  await expect(row.getByRole("button", { name: "Mark pending" })).toBeVisible();
  await expect(
    page
      .locator(".han-card")
      .filter({ hasText: "Shared assignment" })
      .getByRole("combobox", { name: "Status for Shared assignment", exact: true }),
  ).toHaveValue("COMPLETED", { timeout: 4000 });
  await context.close();
});
