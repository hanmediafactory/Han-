import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const evidence = 'work/qa-20261010/evidence';
mkdirSync(evidence, { recursive: true });
async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Harsha Owner / Admin' }).click();
  await page.getByLabel(/Account Password/).fill('test-only-password-123456');
  await page.getByRole('button', { name: /Enter HAN Workspace/ }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Harsha.' })).toBeVisible();
}
async function inventory(page: Page, screen: string) {
  const controls = await page.locator('button,input:not([hidden]),textarea,select,a[href],[role="radio"],summary').evaluateAll(nodes => nodes.filter(n => (n as HTMLElement).getBoundingClientRect().width > 0).map(n => ({
    tag: n.tagName.toLowerCase(), role: n.getAttribute('role'), type: n.getAttribute('type'),
    name: n.getAttribute('aria-label') || (n.id ? document.querySelector(`label[for="${n.id}"]`)?.textContent?.trim() : '') || n.textContent?.trim().replace(/\s+/g, ' ').slice(0, 160),
    id: n.id, disabled: n.hasAttribute('disabled'),
    options: n.tagName === 'SELECT' ? Array.from((n as HTMLSelectElement).options).map(o => ({ value: o.value, label: o.text })) : undefined,
  })));
  writeFileSync(`${evidence}/controls-${screen}.json`, JSON.stringify({ screen, controls }, null, 2));
}

test('QA-ROUTE-001 all home creation shortcuts open their own form and cancellation preserves navigation', async ({ page }) => {
  await login(page);
  const actions = [
    { button: '+ Task', heading: 'New Task', label: 'Task title' },
    { button: '+ Project', heading: 'New Project', label: 'Project name' },
    { button: 'Log Money', heading: 'New Expense', label: 'Amount (₹)' },
    { button: 'Add Lead', heading: 'New Lead', label: 'Lead name' },
  ];
  for (const action of actions) {
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: action.button, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: action.heading, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(action.label, { exact: true })).toBeVisible();
    await inventory(page, action.heading.replace(/ /g, '-'));
    await page.screenshot({ path: `${evidence}/${action.heading.replace(/ /g, '-')}.png` });
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await page.getByRole('button', { name: /^Project: Reviewly,/ }).click();
  await expect(page.getByRole('heading', { name: 'Reviewly', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('QA-KEYBOARD-001 Ctrl+K opens an accessible searchable dialog and Escape restores focus', async ({ page }) => {
  await login(page);
  const trigger = page.getByRole('button', { name: 'Quick Actions', exact: true });
  await trigger.focus();
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole('textbox');
  await expect(search).toBeFocused();
  await search.fill('Reviewly');
  await expect(dialog.getByRole('button', { name: /^Reviewly Project/ })).toBeVisible();
  await page.screenshot({ path: `${evidence}/command-search.png` });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('QA-PERM-001 restricted members cannot open creation forms from home or quick actions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Nihaal Team Member' }).click();
  await page.getByLabel(/Account Password/).fill('test-only-password-123456');
  await page.getByRole('button', { name: /Enter HAN Workspace/ }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Nihaal.' })).toBeVisible();
  for (const name of ['+ Task', '+ Project', 'Log Money']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Quick Actions', exact: true }).click();
  await expect(page.getByRole('button', { name: /^New Task/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^New Project/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Money', exact: true }).click();
  // Existing product contract shares ledger reads; management remains permission controlled.
  await expect(page.getByRole('region', { name: 'Funds and shared financial ledger' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add expense', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Record salary', exact: true })).toHaveCount(0);
});

test('QA-INVENTORY-001 all main screens, searches and empty states render without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await login(page);
  for (const screen of ['Home', 'Money', 'Work', 'Growth', 'You']) {
    await page.getByRole('button', { name: screen, exact: true }).click();
    await inventory(page, screen);
    await expect(page.getByRole('navigation')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await inventory(page, 'Calendar');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await inventory(page, 'Notifications');
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search Projects' }).fill('QA-no-such-project-73102');
  await expect(page.getByText('No Projects matching "QA-no-such-project-73102"', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search Projects' }).fill('Reviewly');
  await expect(page.getByRole('button', { name: /^Project: Reviewly,/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('QA-AUTH-001 invalid credentials show an error and never grant a session', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Enter HAN Workspace/ })).toBeDisabled();
  await page.getByLabel(/Account Password/).fill('incorrect-QA-password');
  await page.getByRole('button', { name: /Enter HAN Workspace/ }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect((await page.request.get('/api/state')).status()).toBe(401);
  await expect(page.getByRole('heading', { name: 'Who are you?' })).toBeVisible();
});
