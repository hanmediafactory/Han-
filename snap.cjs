const { chromium } = require('playwright');
async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5174/?skip-intro=1');
  await page.waitForTimeout(1500);
  const pw = await page.locator('input[type="password"]').first();
  if (await pw.isVisible()) {
    await pw.fill('test-only-password-123456');
    await page.locator('button:has-text("Sign in")').click();
    await page.waitForTimeout(3000);
  }
  const art = 'C:/Users/Rakesh/.gemini/antigravity-ide/brain/bef1e147-291c-414e-8ad7-3915110a8554/desktop_command_center.png';
  await page.screenshot({ path: art });
  console.log('Snapshot written!');
  await browser.close();
}
main().catch(console.error);
