/**
 * ================================================================================
 * TC-SIDEBAR-SEARCH-03 — Verify The Sidebar Search On A Phone Screen, With The Sidebar Collapsed, For Assistive Tech, Its Speed And In Firefox/WebKit
 * Modul    : Sidebar > Search & Collapse (U085)
 * Kategori : Edge (!) 4.8 | Non-Functional (7) 7.1 7.2 7.3 7.4 7.5 | UI (8) 8.1 8.2 8.3
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SIDEBAR-SEARCH-03-Verify-Search-On-Mobile-Collapse-Accessibility-Speed-And-Other-Browsers.spec.ts
 * Path     : tests/_global/sidebar-search/
 * ================================================================================
 *
 * TUJUAN:
 *   8.3  Kotak Search punya nama aksesibel "Search" (role textbox) & bisa dicapai dgn Tab dari
 *        tombol sebelum/ sesudahnya; ketiadaan <label>/aria-label (nama hanya dari placeholder)
 *        dicatat sbg finding.
 *   7.5  Filter tampil < 300 ms setelah mengetik (diukur di browser).
 *   4.8  Tombol collapse sidebar: saat diciutkan kotak Search tidak bisa dipakai; dibuka lagi ->
 *        kotak kembali & query sebelumnya tetap/hilang dicatat (known behaviour).
 *   8.1  Layar ponsel 375x812: sidebar dibuka lewat hamburger, kotak Search terlihat & memfilter.
 *   7.1-7.3  Tidak ada console error / request gagal selama semua langkah (cek otomatis TestReport);
 *   7.4  console warning selama pencarian dicatat & tidak ada warning dari kode aplikasi.
 *   8.2  Firefox & WebKit: login, filter "le" -> Leave, hapus -> 12 modul.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sidebar-search/TC-SIDEBAR-SEARCH-03-Verify-Search-On-Mobile-Collapse-Accessibility-Speed-And-Other-Browsers.spec.ts --project=chromium
 * ================================================================================
 */

import { expect, firefox, webkit, type BrowserType } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { searchSidebar, sidebarSearchBox } from '../../../src/utils/sidebarSearch';

test('TC-SIDEBAR-SEARCH-03: sidebar search on mobile, collapsed, for assistive tech, speed and other browsers', async ({ page }, testInfo) => {
  testInfo.setTimeout(360_000);
  const report = new TestReport('TC-SIDEBAR-SEARCH-03', 'Search Mobile Collapse Accessibility Speed Browsers', env.baseURL, page);
  const warnings: string[] = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

  report.step('Aksesibilitas kotak Search');
  await page.goto('/web/index.php/dashboard/index');
  await page.waitForLoadState('networkidle');
  const byRole = page.getByRole('textbox', { name: 'Search' });
  report.check('8.3 Kotak Search punya role textbox dgn nama aksesibel "Search"', (await byRole.count()) === 1, `jumlah=${await byRole.count()}`);
  const labelling = await sidebarSearchBox(page).evaluate((el) => ({
    aria: el.getAttribute('aria-label'), labelledby: el.getAttribute('aria-labelledby'), label: !!(el as HTMLInputElement).labels?.length,
  }));
  if (!labelling.aria && !labelling.labelledby && !labelling.label) report.finding('8.3 Nama aksesibel kotak Search', 'hanya dari placeholder (tanpa <label>/aria-label): hilang begitu pengguna mulai mengetik');
  await sidebarSearchBox(page).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const focused = await sidebarSearchBox(page).evaluate((el) => el === document.activeElement);
  report.check('8.3 Kotak Search bisa dicapai dgn keyboard (Tab)', focused, `fokus=${focused}`);

  report.step('Kecepatan filter');
  const ms = await page.evaluate(async () => {
    const input = document.querySelector('.oxd-sidepanel input') as HTMLInputElement;
    const t0 = performance.now();
    input.value = 'le';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const ok = document.querySelectorAll('.oxd-main-menu-item').length === 1;
    return ok ? performance.now() - t0 : -1;
  });
  report.check('7.5 Filter tampil < 300 ms setelah mengetik', ms >= 0 && ms < 300, `${ms.toFixed(1)} ms`);
  await searchSidebar(page, '');

  report.step('Sidebar diciutkan');
  await searchSidebar(page, 'Time');
  const toggle = page.locator('.oxd-main-menu-button');
  await toggle.click();
  const usableCollapsed = await sidebarSearchBox(page).isEditable({ timeout: 2_000 }).then(async (e) => e && (await sidebarSearchBox(page).isVisible()) && (await sidebarSearchBox(page).boundingBox())!.width > 20).catch(() => false);
  report.check('4.8 Sidebar diciutkan -> kotak Search tidak bisa dipakai (tersembunyi/menyempit)', !usableCollapsed, `bisaDipakai=${usableCollapsed}`);
  await toggle.click();
  await expect(sidebarSearchBox(page)).toBeVisible();
  const kept = await sidebarSearchBox(page).inputValue();
  report.check('4.8 Sidebar dibuka lagi -> kotak Search kembali bisa dipakai', await sidebarSearchBox(page).isEditable(), `queryTersisa=${JSON.stringify(kept)}`);
  report.finding('4.8 Query setelah collapse/expand', kept ? `query "${kept}" dipertahankan, menu tetap terfilter` : 'query dikosongkan');
  await searchSidebar(page, '');

  report.step('Layar ponsel 375x812');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await page.waitForLoadState('networkidle');
  const hamburger = page.locator('header i.bi-list, .oxd-topbar-header-hamburger').first();
  if (await hamburger.isVisible().catch(() => false)) await hamburger.click();
  const mobileVisible = await sidebarSearchBox(page).waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);
  const mobileHits = mobileVisible ? await searchSidebar(page, 'le') : [];
  report.check('8.1 Ponsel: sidebar dibuka lewat hamburger, kotak Search terlihat & memfilter', mobileVisible && JSON.stringify(mobileHits) === JSON.stringify(['Leave']), `terlihat=${mobileVisible}, hasil=${mobileHits.join(', ')}`);
  await page.setViewportSize({ width: 1280, height: 720 });

  const appWarnings = warnings.filter((w) => !/DevTools|third-party|Download the Vue/i.test(w));
  report.check('7.4 Tidak ada console warning dari aplikasi selama pencarian', appWarnings.length === 0, appWarnings.slice(0, 3).join(' | ') || 'tidak ada');

  for (const [name, engine] of [['firefox', firefox], ['webkit', webkit]] as Array<[string, BrowserType]>) {
    report.step(`8.2 ${name}`);
    const b = await engine.launch();
    try {
      const p = await (await b.newContext({ baseURL: env.baseURL })).newPage();
      await p.goto('/web/index.php/auth/login', { timeout: 90_000 });
      await p.getByPlaceholder('Username').fill(env.username);
      await p.getByPlaceholder('Password').fill(env.password);
      await p.getByRole('button', { name: 'Login' }).click();
      await p.waitForURL(/dashboard/, { timeout: 60_000 });
      await p.waitForLoadState('networkidle');
      const hit = await searchSidebar(p, 'le');
      const back = await searchSidebar(p, '');
      report.check(`8.2 ${name}: "le" -> Leave, hapus -> 12 modul`, JSON.stringify(hit) === JSON.stringify(['Leave']) && back.length === 12, `hasil=${hit.join(', ')}, kembali=${back.length}`);
    } finally {
      await b.close();
    }
  }
  report.print();
});
