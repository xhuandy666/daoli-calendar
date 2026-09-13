const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('desktop journal persists, isolates dates, restores backups and renders responsively', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'daoli-test-'));
  const launch = () => electron.launch({
    ...(process.env.DAOLI_TEST_EXECUTABLE ? { executablePath: process.env.DAOLI_TEST_EXECUTABLE, args: [] } : { args: ['.'] }),
    env: { ...process.env, DAOLI_TEST_USER_DATA: dir }
  });
  let app;
  try {
    app = await launch();
    let page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('#journalFields')).toBeEnabled();
    const date = await page.locator('#datePicker').inputValue();
    await page.locator('#journalText').fill('甲乙木：今天散步后心情轻松。<script>不执行</script>');
    await page.locator('#influence-wood').selectOption('滋养');
    await page.locator('#journalMood').selectOption('愉快');
    await expect(page.locator('#journalStatus')).toHaveText('已保存到本机');
    await expect(page.locator('.is-selected')).toHaveClass(/has-journal/);
    await page.locator('#nextDay').click();
    await expect(page.locator('#journalText')).toHaveValue('');
    await page.locator('#prevDay').click();
    await expect(page.locator('#journalText')).toHaveValue(/散步/);
    await expect(page.locator('#influence-wood')).toHaveValue('滋养');
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await expect(page.locator('#journalText')).toHaveValue(/散步/);
    await expect(page.locator('#journalMood')).toHaveValue('愉快');
    const backup = path.join(dir, 'backup.json');
    await app.evaluate(({ session }, backup) => {
      globalThis.downloadState = 'waiting';
      session.defaultSession.once('will-download', (_event, item) => {
        item.setSavePath(backup);
        item.once('done', (_event, state) => { globalThis.downloadState = state; });
      });
    }, backup);
    await page.locator('#journalExport').click();
    await expect.poll(() => app.evaluate(() => globalThis.downloadState)).toBe('completed');
    expect(JSON.parse(await fs.readFile(backup, 'utf8')).entries[date].influences.wood).toBe('滋养');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#journalDelete').click();
    await expect(page.locator('#journalText')).toHaveValue('');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#journalFile').setInputFiles(backup);
    await expect(page.locator('#journalStatus')).toHaveText('备份已导入');
    await expect(page.locator('#journalText')).toHaveValue(/散步/);
    await page.locator('#journalFile').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"entries":{"invalid":{}}}') });
    await expect(page.locator('#journalStatus')).toContainText('导入失败');
    await expect(page.locator('#journalText')).toHaveValue(/散步/);
    await page.evaluate(() => DaoliJournal.colorize(document.querySelector('#tGzD'), '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥'));
    expect(await page.locator('#tGzD .wx-wood').count()).toBe(4);
    expect(await page.locator('#tGzD .wx-earth').count()).toBe(6);
    await page.reload();
    await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
    await expect.poll(() => page.locator('.day-cell.is-selected').evaluate(node => getComputedStyle(node).opacity)).toBe('1');
    await page.screenshot({ path: 'test-results/desktop-final.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/mobile.png', fullPage: true, animations: 'disabled' });
    await page.locator('[data-tab="calendar"]').click();
    await expect(page.locator('#calGrid .day-cell')).toHaveCount(35);
    await page.screenshot({ path: 'test-results/mobile-calendar.png', fullPage: true, animations: 'disabled' });
    await page.locator('[data-tab="today"]').click();
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new Error('quota exceeded'); };
    });
    await page.locator('#journalText').fill('未保存草稿');
    await expect(page.locator('#journalStatus')).toContainText('保存失败');
    await page.locator('#nextDay').click();
    await expect(page.locator('#datePicker')).toHaveValue(date);
    await expect(page.locator('#journalText')).toHaveValue('未保存草稿');
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await page.locator('#journalText').fill('恢复保存');
    await expect(page.locator('#journalStatus')).toHaveText('已保存到本机');
    expect(errors).toEqual([]);
  } finally {
    if (app) await app.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
