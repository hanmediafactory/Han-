const { chromium } = require('playwright');¡async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);
  
  const heading = await page.$('heading:has-text("Who are you?")');
  if (heading || await page.$('text=Who are you?')) {
    console.log('Authenticating owner account...');
    await page.click('text=Harsha Owner / Admin');
    await page.fill('input[type="password"]', 'test-only-password-123456');
    await page.click('button:has-text("Enter HAN")');
    await page.waitForTimeout(2000);
  }
  
  await page.screenshot({ path: 'desktop_command_center.png', fullPage: false });
  console.log('Screenshot saved to desktop_command_center.png');
  await browser.close();
})();
