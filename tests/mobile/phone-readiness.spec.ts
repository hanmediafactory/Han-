import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const evidence = 'work/mobile-readiness-2026-10-27';
mkdirSync(evidence, { recursive: true });
test.use({ isMobile: true, hasTouch: true });
test('Small phone login, navigation, forms and light/dark surfaces stay usable', async ({page}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Essential Only',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Essential Only',exact:true}).click();
  for (const [width,height] of [[320,568],[360,800],[390,844],[400,498],[430,932]]) {
    await page.setViewportSize({width,height});
    const submit = page.getByRole('button', {name:'Enter HAN', exact:true});
    await submit.scrollIntoViewIfNeeded();
    const box = await submit.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({animations:'disabled',path:`${evidence}/login-${width}.png`});
  }
  await page.getByLabel(/Account Password/).fill('test-only-password-123456');
  await page.getByRole('button',{name:'Enter HAN',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Welcome back, Harsha.'})).toBeVisible();
  if (await page.getByRole('button',{name:'Essential Only',exact:true}).isVisible()) await page.getByRole('button',{name:'Essential Only',exact:true}).click();
  if (await page.getByRole('button',{name:'Dismiss notification alert'}).isVisible()) await page.getByRole('button',{name:'Dismiss notification alert'}).click();
  for (const theme of ['Light','Dark']) {
    await page.getByRole('button',{name:'You',exact:true}).click();
    await page.getByRole('button',{name:/Appearance/}).click();
    await page.getByRole('button',{name:theme,exact:true}).click();
    for (const [width,height] of [[320,568],[360,800],[390,844],[400,498],[430,932]]) {
      await page.setViewportSize({width,height});
      for (const screen of ['Home','Money','Work','Growth','You']) {
        const button = page.getByRole('button',{name:screen,exact:true});
        await button.click();
        const box = await button.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({animations:'disabled',path:`${evidence}/${screen}-${theme}-${width}.png`});
      }
    }
  }
  await page.setViewportSize({width:320,height:568});
  await page.getByRole('button',{name:'Home',exact:true}).click();
  for (const [action,title] of [['Task','New Task'],['Project','New Project'],['Log Money','New Expense'],['Add Lead','New Lead']]) {
    await page.getByRole('button',{name:'Home',exact:true}).click();
    await page.getByRole('button',{name:action,exact:true}).click();
    const dialog = page.getByRole('dialog',{name:title,exact:true});
    await expect(dialog).toBeVisible();
    const save = dialog.getByRole('button',{name:'Save',exact:true});
    await save.scrollIntoViewIfNeeded();
    const box = await save.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(569);
    await page.screenshot({animations:'disabled',path:`${evidence}/${title}-320.png`});
    await page.getByRole('button',{name:'Close dialog'}).click();
  }
  await page.getByRole('button',{name:'Quick Actions',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Quick actions',exact:true})).toBeVisible();
  await page.screenshot({animations:'disabled',path:`${evidence}/quick-actions-320.png`});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Home',exact:true}).click();
  await page.getByRole('button',{name:'Task',exact:true}).click();
  await page.getByLabel('Task title',{exact:true}).fill('Phone touch target verification');
  await page.getByRole('dialog',{name:'New Task',exact:true}).getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('textbox',{name:'Search Tasks'}).fill('Phone touch target verification');
  await expect(page.getByRole('heading',{name:'Phone touch target verification',exact:true})).toBeVisible();
  const progressButtons = page.getByRole('button',{name:/Set progress to/});
  for (const button of await progressButtons.all()) {
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('heading',{name:'Phone touch target verification',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({animations:'disabled',path:`${evidence}/saved-task-320.png`});
  expect(errors).toEqual([]);
});
