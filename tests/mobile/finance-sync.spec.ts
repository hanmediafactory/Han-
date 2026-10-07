import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const day = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
async function login(page: Page, member = false) {
  await page.goto("/");
  await page.getByRole("radio", { name: member ? "Nihaal Team Member" : "Harsha Owner / Admin" }).click();
  await page.getByLabel(/Account Password/).fill("test-only-password-123456");
  await page.getByRole("button", { name: /Enter HAN Workspace/ }).click();
  await expect(page.getByRole("heading", { name: member ? "Welcome back, Nihaal." : "Welcome back, Harsha." })).toBeVisible();
}
async function state(page: Page) { return (await page.request.get("/api/state")).json(); }
async function create(page: Page, path: string, data: unknown) {
  const session = await (await page.request.get("/api/session")).json();
  const response = await page.request.post(`/api/${path}`, { data, headers: { "X-CSRF-Token": session.csrf } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test("Protected savings, manual salary and overspend rejection stay consistent after reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Money", exact: true }).click();
  await page.getByRole("button", { name: "Add income", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Finance workflow funds");
  await page.getByLabel("Amount (₹)").fill("10000");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const before = (await state(page)).finance;
  await page.getByRole("button", { name: "Protect savings", exact: true }).click();
  await page.getByLabel("Savings purpose").fill("Untouchable reserve");
  await page.getByLabel("Amount (₹)").fill("1500");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("savings-balance")).toHaveText(`₹${(before.savings + 1500).toLocaleString("en-IN")}`);
  await expect(page.getByTestId("savings-balance")).toHaveCSS("color", "rgb(15, 15, 15)");
  await page.getByRole("button", { name: "Record salary", exact: true }).click();
  await page.getByLabel("Paid to").fill("Manual salary recipient");
  await page.getByLabel("Amount (₹)").fill("800.25");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const after = (await state(page)).finance;
  expect(after.funds).toBe(before.funds - 2300.25);
  expect(after.expenses).toBe(before.expenses + 800.25);
  expect(after.savings).toBe(before.savings + 1500);
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Rejected overspending");
  await page.getByLabel("Amount (₹)").fill(String(after.funds + 1));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText(/Insufficient spendable funds/)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("han_v2_queue_user-1") || "[]").length)).toBe(0);
  await page.reload();
  await page.getByRole("button", { name: "Money", exact: true }).click();
  expect((await state(page)).finance).toEqual(after);
  await page.screenshot({ path: "test-results/han-money-complete.png" });
  await page.getByText(/Salary history \(/).click();
  await expect(page.getByText("Manual salary recipient · ₹800.25", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Correct record" }).last().click();
  await page.getByLabel("Amount (₹)").fill("700.25");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await state(page)).finance.funds).toBe(after.funds + 100);
});

test("Two sessions sync assignments, completion, project progress and alerts without reloading", async ({ page, browser }) => {
  await login(page);
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3101", viewport: { width: 390, height: 844 } });
  const member = await context.newPage();
  try {
    await login(member, true);
    await member.getByRole("button", { name: "Work", exact: true }).click();
    await member.getByRole("button", { name: "View tasks", exact: true }).click();
    await expect(page.getByText("Live sync active", { exact: true })).toBeVisible();
    const project = await create(page, "projects", { name: "Live synchronization project", memberIds: ["user-1", "user-2"], deadline: day() });
    const assigned = await create(page, "tasks", { title: "Live shared assignment", assignedUserId: "user-2", projectId: project.id, date: day() });
    const own = await create(page, "tasks", { title: "Owner synchronization task", assignedUserId: "user-1", projectId: project.id, date: day() });
    const row = member.locator(".han-card").filter({ has: member.getByRole("heading", { name: "Live shared assignment", exact: true }) });
    await expect(row).toBeVisible({ timeout: 4000 });
    await expect(member.getByRole("heading", { name: "Owner synchronization task", exact: true })).toHaveCount(0);
    await row.getByRole("button", { name: "Mark complete", exact: true }).click();
    await expect(page.getByRole("button", { name: "Project: Live synchronization project, Progress: 50 percent", exact: true })).toBeVisible({ timeout: 4000 });
    await expect(page.getByRole("status", { name: "New notification alert" })).toContainText("Task completed");
    const session = await (await page.request.get("/api/session")).json();
    await page.request.patch(`/api/tasks/${own.id}`, { data: { status: "COMPLETED" }, headers: { "X-CSRF-Token": session.csrf } });
    await expect(page.getByRole("button", { name: /^Project: Live synchronization project,/ })).toHaveCount(0, { timeout: 4000 });
    await page.getByRole("button", { name: "Work", exact: true }).click();
    await page.getByRole("button", { name: "Completed", exact: true }).click();
    await expect(page.getByRole("button", { name: "Project: Live synchronization project, Progress: 100 percent", exact: true })).toBeVisible({ timeout: 4000 });
    const latest = await state(page);
    expect(latest.tasks.find((task: { id: string }) => task.id === assigned.id).completed).toBeTruthy();
    await member.getByRole("button", { name: "You", exact: true }).click();
    await member.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(member.locator(".han-card").filter({ hasText: "Live shared assignment" })).toContainText("Completed");
    await page.screenshot({ path: "test-results/han-live-sync.png" });
  } finally { await context.close(); }
});

test("Tasks created from project details retain the project and assignee filters work", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await page.getByRole("button", { name: /^Project: Reviewly,/ }).click();
  await page.getByRole("button", { name: "Manage tasks", exact: true }).click();
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue("proj-1");
  await page.getByLabel("Task title").fill("Scoped project creation");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Scoped project creation", exact: true })).toBeVisible();
  expect((await state(page)).tasks.find((task: { title: string }) => task.title === "Scoped project creation").projectId).toBe("proj-1");
  await page.getByLabel("Assigned to", { exact: true }).selectOption("user-2");
  await expect(page.getByRole("heading", { name: "Scoped project creation", exact: true })).toHaveCount(0);
  await page.getByLabel("Assigned to", { exact: true }).selectOption("All");
  await expect(page.getByRole("heading", { name: "Scoped project creation", exact: true })).toBeVisible();
});

test("Activity history shows real timestamps and supports keyboard expansion", async ({ page }) => {
  await login(page);
  await create(page, "calendar_events", { title: "Activity timestamp check", date: day(), assignedUserId: "user-1" });
  await page.getByRole("button", { name: "You", exact: true }).click();
  const toggle = page.getByRole("button", { name: "Toggle activity history" });
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("main")).not.toContainText("Invalid Date");
});

test("Switching accounts in a shared browser clears the previous tab's private workspace", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Live sync active", { exact: true })).toBeVisible();
  const second = await page.context().newPage();
  try {
    await second.goto("/");
    await expect(second.getByRole("heading", { name: "Welcome back, Harsha.", exact: true })).toBeVisible();
    const switched = await second.request.post("/api/login", { data: { userId: "user-2", password: "test-only-password-123456" } });
    expect(switched.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Who are you?", exact: true })).toBeVisible({ timeout: 4000 });
    await expect(page.getByRole("heading", { name: "Welcome back, Harsha.", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("han_v2_cache_user-1"))).toBeNull();
    const memberState = await state(second);
    expect(memberState.viewerId).toBe("user-2");
    expect(memberState.finance).toBeNull();
    expect(memberState.savings_entries).toEqual([]);
  } finally { await second.close(); }
});
