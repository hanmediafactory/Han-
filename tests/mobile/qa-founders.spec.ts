import { test, expect, type Page } from '@playwright/test';

const password = 'test-only-password-123456';
const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
async function login(page: Page, name = 'Harsha') {
  await page.goto('/');
  await page.getByRole('radio', { name: `${name} ${name === 'Harsha' ? 'Owner / Admin' : 'Team Member'}` }).click();
  await page.getByLabel(/Account Password/).fill(password);
  await page.getByRole('button', { name: /Enter HAN Workspace/ }).click();
  await expect(page.getByRole('heading', { name: `Welcome back, ${name}.` })).toBeVisible();
}
async function state(page: Page) { const response = await page.request.get('/api/state'); expect(response.ok()).toBeTruthy(); return response.json(); }
async function mutate(page: Page, path: string, method: string, data: unknown) {
  const response = await page.request.get('/api/session');
  const session = await response.json();
  const result = await page.request.fetch(`/api/${path}`, { method, data, headers: { 'X-CSRF-Token': session.csrf } });
  expect(result.ok()).toBeTruthy(); return result.json();
}

test('QA-FOUNDERS-001 all four permitted founders create full projects/tasks and persist expanded states', async ({ page, browser }) => {
  test.setTimeout(90000);
  await login(page);
  const initial = await state(page);
  const originals = initial.users.filter((user: { id: string }) => user.id !== 'user-1');
  const permissions = ['projects.manage', 'tasks.manage', 'finance.manage', 'finance.view', 'leads.manage', 'funnels.manage', 'calendar.manage'];
  // Grant only disposable local fixture users. Never points to production.
  for (const user of originals) await mutate(page, `users/${user.id}`, 'PATCH', { name: user.name, role: user.role, active: user.active, permissions });
  try {
    for (const [index, name] of ['Harsha', 'Nihaal', 'Lalitha', 'Abhilash'].entries()) {
      const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3101', viewport: { width: 390, height: 844 } });
      const founder = await context.newPage();
      try {
        await login(founder, name);
        await founder.getByRole('button', { name: '+ Project', exact: true }).click();
        const projectName = `QA ${name} shared project`;
        await founder.getByLabel('Project name', { exact: true }).fill(projectName);
        for (const member of ['Harsha', 'Nihaal', 'Lalitha', 'Abhilash']) await founder.getByLabel(member, { exact: true }).check();
        await founder.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(founder.getByRole('button', { name: new RegExp(`^Project: ${projectName},`) })).toBeVisible();
        await founder.getByRole('button', { name: new RegExp(`^Project: ${projectName},`) }).click();
        await founder.getByRole('button', { name: 'Manage tasks', exact: true }).click();
        await founder.getByRole('button', { name: 'Add task', exact: true }).click();
        await founder.getByLabel('Task title').fill(`QA ${name} full task`);
        await founder.getByLabel('Description', { exact: true }).fill('Complete fixture payload and persistence');
        await founder.getByLabel('Assigned user', { exact: true }).selectOption(`user-${(index + 1) % 4 + 1}`);
        await founder.getByLabel('Priority', { exact: true }).selectOption('URGENT');
        await founder.getByLabel('Status', { exact: true }).selectOption('IN_REVIEW');
        await founder.getByLabel('Due date', { exact: true }).fill(day());
        await founder.getByRole('button', { name: 'Save', exact: true }).click();
        const status = founder.getByRole('combobox', { name: `Status for QA ${name} full task`, exact: true });
        await expect(status).toHaveValue('IN_REVIEW');
        await status.selectOption('BLOCKED');
        await expect(status).toHaveValue('BLOCKED');
        const saved = (await state(founder)).tasks.find((task: { title: string }) => task.title === `QA ${name} full task`);
        expect(saved.description).toBe('Complete fixture payload and persistence');
        expect(saved.priority).toBe('URGENT'); expect(saved.status).toBe('BLOCKED');
        expect(saved.assignedUserId).toBe(`user-${(index + 1) % 4 + 1}`);
        await founder.reload();
        await founder.getByRole('button', { name: 'Work', exact: true }).click();
        await founder.getByRole('button', { name: 'View tasks', exact: true }).click();
        await expect(founder.getByRole('combobox', { name: `Status for QA ${name} full task`, exact: true })).toHaveValue('BLOCKED');
        await founder.screenshot({ path: `work/qa-20261010/evidence/founder-${name}.png` });
      } finally { await context.close(); }
    }
  } finally {
    for (const user of originals) await mutate(page, `users/${user.id}`, 'PATCH', { name: user.name, role: user.role, active: user.active, permissions: user.permissions });
  }
});

test('QA-FINANCE-001 custom allocations reject mismatches, settle partial debts and preserve verified ledger after reload', async ({ page }) => {
  await login(page);
  await mutate(page, 'income', 'POST', { title: 'QA allocation funding', amount: 20000, category: 'Revenue', date: day() });
  const before = (await state(page)).finance;
  await page.getByRole('button', { name: 'Money', exact: true }).click();
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('QA custom shared invoice');
  await page.getByLabel('Amount (₹)', { exact: true }).fill('100');
  await page.getByLabel('Paid by', { exact: true }).selectOption('user-1');
  await page.getByRole('button', { name: 'Custom Split', exact: true }).click();
  await page.getByLabel('Allocation for Harsha').fill('25');
  await page.getByLabel('Allocation for Nihaal').fill('25');
  await page.getByLabel('Allocation for Lalitha').fill('25');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('does not reconcile');
  expect((await state(page)).finance.expenses).toBe(before.expenses);
  await page.getByLabel('Allocation for Abhilash').fill('25');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = (await state(page)).finance;
  expect(after.expenses).toBe(before.expenses + 100);
  expect(after.funds).toBe(before.funds - 100);
  const nihaalPair = after.pairwise.find((pair: { debtorId: string; creditorId: string }) => pair.debtorId === 'user-2' && pair.creditorId === 'user-1');
  expect(nihaalPair.amount).toBeGreaterThanOrEqual(25);
  await page.getByRole('button', { name: /Settle Debt/, exact: false }).first().click();
  await page.getByLabel('Payer (who paid)').selectOption('user-2');
  await page.getByLabel('Recipient (who received)').selectOption('user-1');
  await page.getByLabel('Settlement amount (₹)').fill('10');
  await page.getByLabel('Payment Reference / UTR').fill('QA-LOCAL-REFERENCE');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const settled = (await state(page)).finance;
  expect(settled.funds).toBe(after.funds);
  expect(settled.pairwise.find((pair: { debtorId: string; creditorId: string }) => pair.debtorId === 'user-2' && pair.creditorId === 'user-1').amount).toBe(nihaalPair.amount - 10);
  await page.reload(); await page.getByRole('button', { name: 'Money', exact: true }).click();
  expect((await state(page)).finance).toEqual(settled);
  await page.getByText(/Reimbursement Settlements History/).click();
  await expect(page.getByText('Ref: QA-LOCAL-REFERENCE', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'work/qa-20261010/evidence/settlement-reconciliation.png' });
});
