const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5174/?skip-intro=1');
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => { document.documentElement.classList.remove('light'); });
  await page.fill('input[type="password"]', 'test-only-password-123456');
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(3000);
  
  const artifactPath = 'C:/Users/Rakesh/.gemini/antigravity-ide/brain/bef1e147-291c-414e-8ad7-3915110a8554/desktop_command_center.png';
  await page.screenshot({ path: artifactPath });
  console.log('Screenshot updated in dark mode');
  await browser.close();
}
run().catch(console.error);
