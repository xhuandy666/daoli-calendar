const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { relation, validate } = require('../www/bazi.js');

test('ten gods respect both the day master and stem polarity', () => {
  const stems = [...'甲乙丙丁戊己庚辛壬癸'];
  const fixtures = {
    癸: ['伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩'],
    甲: ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印']
  };
  for (const [master, expected] of Object.entries(fixtures)) {
    expect(stems.map(stem => relation(master, stem).god)).toEqual(expected);
  }
  expect(relation('癸', '寅').hidden).toEqual([
    { stem: '甲', god: '伤官' }, { stem: '丙', god: '正财' }, { stem: '戊', god: '正官' }
  ]);
  expect([...'子丑寅卯辰巳午未申酉戌亥'].map(zhi => relation('癸', zhi).god)).toEqual([
    '比肩', '七杀', '伤官', '食神', '正官', '正财', '偏财', '七杀', '正印', '偏印', '正官', '劫财'
  ]);
  expect(relation('', '甲')).toBeNull();
  expect(relation('癸', '年')).toBeNull();
});

test('manual pillars reject invalid pairs and derive master only from the entered day pillar', () => {
  const source = { version: 1, mode: 'pillars', dayMaster: '甲', pillars: { year: '甲子', month: '丙寅', day: '癸酉', time: '壬子' } };
  expect(validate(source).dayMaster).toBe('癸');
  expect(() => validate({ ...source, pillars: { ...source.pillars, day: '癸子' } })).toThrow('日柱');
  expect(() => validate({ version: 1, mode: 'pillars', pillars: {} })).toThrow('年柱');
  expect(() => validate({ version: 1, mode: 'master', dayMaster: '<script>' })).toThrow();
});

test('profile survives restart and updates calendar without disturbing journal drafts', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'daoli-bazi-'));
  const launch = () => electron.launch({
    ...(process.env.DAOLI_TEST_EXECUTABLE ? { executablePath: process.env.DAOLI_TEST_EXECUTABLE, args: [] } : { args: ['.'] }),
    env: { ...process.env, DAOLI_TEST_USER_DATA: dir }
  });
  let app;
  try {
    app = await launch();
    let page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await expect(page.locator('#baziSummary')).toHaveText('我的八字 · 未设置');
    await expect(page.locator('.cal-shishen')).toHaveCount(0);
    await page.locator('#datePicker').fill('2026-02-03');
    await page.locator('#journalText').fill('保留我的手记');
    await page.locator('#baziSummary').click();
    for (const [field, value] of Object.entries({ year: '甲子', month: '丙寅', day: '癸子', time: '壬子' })) await page.locator('#bazi-' + field).fill(value);
    await page.getByRole('button', { name: '保存八字' }).click();
    await expect(page.locator('#baziStatus')).toContainText('未保存');
    await expect(page.locator('.gz-shishen')).toHaveCount(0);
    await page.locator('#bazi-day').fill('癸酉');
    await page.getByRole('button', { name: '保存八字' }).click();
    await expect(page.locator('#baziSummary')).toContainText('癸水日主');
    await expect(page.locator('#tGzY')).toHaveText('乙巳年');
    await expect(page.locator('#tGzY').locator('..').locator('.gz-shishen')).toHaveText('干 · 食神支 · 正财');
    await page.locator('#nextDay').click();
    await expect(page.locator('#tGzY')).toHaveText('丙午年');
    await expect(page.locator('#tGzM')).toHaveText('庚寅月');
    await expect(page.locator('#tGzM').locator('..').locator('.gz-shishen')).toHaveText('干 · 正印支 · 伤官');
    await page.locator('#baziHidden summary').click();
    await expect(page.locator('#baziHiddenList')).toContainText('甲 · 伤官（本气）');
    await expect(page.locator('.is-selected .cal-shishen')).toHaveText('七杀偏印');
    await page.locator('#prevDay').click();
    await expect(page.locator('#journalText')).toHaveValue('保留我的手记');
    await app.close();
    app = await launch(); page = await app.firstWindow();
    page.on('pageerror', e => errors.push(e.message));
    await expect(page.locator('#baziSummary')).toContainText('癸水日主');
    await page.locator('#baziSummary').click();
    await expect(page.locator('#bazi-day')).toHaveValue('癸酉');
    await page.locator('#datePicker').fill('2026-02-04');
    await page.locator('#baziSummary').click();
    await page.screenshot({ path: 'test-results/bazi-desktop.png', fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#baziSummary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/bazi-input-mobile.png', fullPage: true, animations: 'disabled' });
    await page.locator('#baziSummary').click();
    await page.locator('[data-tab="calendar"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/bazi-mobile.png', fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 1220, height: 920 });
    await page.locator('#baziSummary').click();
    await page.locator('[name="baziMode"][value="master"]').check();
    await page.locator('#baziMaster').selectOption('甲');
    await page.getByRole('button', { name: '保存八字' }).click();
    await expect(page.locator('#tGzM').locator('..').locator('.gz-shishen')).toHaveText('干 · 七杀支 · 比肩');
    await page.evaluate(() => { window.restoreSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw Error('quota'); }; });
    await page.locator('#journalText').fill('尚未保存的草稿');
    await page.locator('#baziMaster').selectOption('癸');
    await page.getByRole('button', { name: '保存八字' }).click();
    await expect(page.locator('#baziStatus')).toContainText('未保存');
    await expect(page.locator('#baziSummary')).toContainText('甲木日主');
    await page.evaluate(() => { Storage.prototype.setItem = window.restoreSetItem; });
    await page.getByRole('button', { name: '保存八字' }).click();
    await expect(page.locator('#journalText')).toHaveValue('尚未保存的草稿');
    await expect(page.locator('#journalStatus')).toContainText('保存失败');
    await page.locator('#journalText').fill('重新保存的草稿');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#baziClear').click();
    await expect(page.locator('.gz-shishen')).toHaveCount(0);
    await expect(page.locator('.cal-shishen')).toHaveCount(0);
    await expect(page.locator('#journalText')).toHaveValue('重新保存的草稿');
    await page.evaluate(() => localStorage.setItem('daoli.bazi.v1', '{broken'));
    await page.reload();
    await page.locator('#baziSummary').click();
    await expect(page.locator('#baziStatus')).toContainText('读取失败');
    await expect(page.locator('.gz-shishen')).toHaveCount(0);
    await expect(page.locator('#tSolar')).not.toHaveText('—');
    expect(errors).toEqual([]);
  } finally {
    if (app) await app.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
