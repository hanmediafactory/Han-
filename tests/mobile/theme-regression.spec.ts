import { test, expect } from '@playwright/test';

test('Login themes preserve input, contrast and reachable actions across viewport sizes', async ({ page }) => {
  await page.goto('/');
  const password = page.getByLabel(/Account Password/);
  await password.fill('visual-check-only');
  for (const theme of ['light', 'dark', 'system']) {
    await page.getByLabel('Appearance', { exact: true }).selectOption(theme);
    await expect(password).toHaveValue('visual-check-only');
    const dark = theme === 'dark';
    if (theme !== 'system') {
      await expect(page.locator('html')).toHaveClass(dark ? 'dark' : 'light');
      const button = page.getByRole('button', { name: 'Enter HAN Workspace' });
      await expect(button).toHaveCSS('background-color', dark ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
      await expect(password).toHaveCSS('padding-left', '40px');
    }
    for (const [width, height] of [[320,568],[360,800],[375,812],[390,844],[400,498],[430,932],[768,1024],[1440,900]]) {
      await page.setViewportSize({ width, height });
      await page.getByRole('button', { name: 'Enter HAN Workspace' }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      const bounds = await page.getByRole('button', { name: 'Enter HAN Workspace' }).boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      await page.screenshot({ animations: 'disabled', path: `work/principal-audit/login-${theme}-${width}.png` });
    }
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveClass('light');
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.reload();
  await expect(page.getByLabel('Appearance', { exact: true })).toHaveValue('dark');
});

test('Missing notification arrays hydrate safely and every primary screen renders in both themes', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/state', async route => {
    const response = await route.fetch();
    const data = await response.json();
    delete data.notifications;
    await route.fulfill({ response, json: data });
  });
  await page.goto('/');
  await page.getByLabel(/Account Password/).fill('test-only-password-123456');
  await page.getByRole('button', { name: 'Enter HAN Workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Harsha.' })).toBeVisible();
  await page.unroute('**/api/state');
  for (const theme of ['Light', 'Dark', 'System']) {
    await page.getByRole('button', { name: 'You', exact: true }).click();
    await page.getByRole('button', { name: /Appearance/ }).click();
    await page.getByRole('button', { name: theme, exact: true }).click();
    await expect(page.getByRole('button', { name: theme, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ animations: 'disabled', path: `work/principal-audit/Appearance-${theme}.png` });
    for (const screen of ['Home', 'Money', 'Work', 'Growth', 'You']) {
      await page.getByRole('button', { name: screen, exact: true }).click();
      if (screen === 'Growth') {
        await expect(page.getByText('+12% this month', { exact: true })).toHaveCount(0);
        await expect(page.getByText('Revenue MTD', { exact: true })).toHaveCount(0);
        await expect(page.getByText('Won Leads', { exact: true })).toBeVisible();
      }
      if (screen === 'Money') {
        await expect(page.getByText('100% this month', { exact: true })).toHaveCount(0);
      }
      await page.screenshot({ animations: 'disabled', path: `work/principal-audit/${screen}-${theme}.png` });
      for (const [width, height] of [[320,568],[360,800],[375,812],[390,844],[400,498],[430,932],[768,1024],[1440,900]]) {
        await page.setViewportSize({ width, height });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await expect(page.getByRole('navigation')).toBeVisible();
        if (width < 540) {
          for (const tab of ['Home', 'Money', 'Work', 'Growth', 'You']) {
            const bounds = await page.getByRole('navigation').getByRole('button', { name: tab, exact: true }).boundingBox();
            expect(bounds!.height).toBeGreaterThanOrEqual(44);
            expect(bounds!.width).toBeGreaterThanOrEqual(44);
          }
          if (screen === 'Home') {
            const shortcut = page.getByRole('button', { name: '+ Task', exact: true });
            await shortcut.scrollIntoViewIfNeeded();
            const bounds = await shortcut.boundingBox();
            expect(bounds!.height).toBeGreaterThanOrEqual(48);
            const nav = await page.getByRole('navigation').boundingBox();
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(nav!.y);
          }
        }
        if ([320,400,1440].includes(width)) {
          await page.screenshot({ animations: 'disabled', path: `work/principal-audit/${screen}-${theme}-${width}.png` });
        }
      }
    }
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    for (const [action, title] of [['+ Project', 'New Project'], ['Add Lead', 'New Lead']]) {
      await page.getByRole('button', { name: 'Home', exact: true }).click();
      await page.getByRole('button', { name: action, exact: true }).click();
      await expect(page.getByRole('dialog', { name: title, exact: true })).toBeVisible();
      await page.screenshot({ animations: 'disabled', path: `work/principal-audit/${title}-${theme}.png` });
      await page.getByRole('button', { name: 'Close dialog' }).click();
    }
    if (await page.getByRole('button', { name: 'Dismiss notification alert' }).isVisible()) {
      await page.getByRole('button', { name: 'Dismiss notification alert' }).click();
    }
    await page.getByRole('button', { name: 'Quick Actions', exact: true }).click();
    await page.screenshot({ animations: 'disabled', path: `work/principal-audit/Quick-Actions-${theme}.png` });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ animations: 'disabled', path: `work/principal-audit/Command-Search-${theme}.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Work', exact: true }).click();
    await page.getByRole('button', { name: /^Project: Reviewly,/ }).click();
    await page.screenshot({ animations: 'disabled', path: `work/principal-audit/Project-Details-${theme}.png` });
    await page.getByRole('button', { name: 'Growth', exact: true }).click();
    await page.getByRole('button', { name: 'Leads', exact: true }).click();
    await page.screenshot({ animations: 'disabled', path: `work/principal-audit/Pipeline-${theme}.png` });
  }
  expect(errors).toEqual([]);
});
