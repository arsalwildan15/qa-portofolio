/**
 * ================================================================================
 * TC-SIDEBAR-SEARCH-02 — Verify The Sidebar Search Sends No Request, Is Safe Against Injection And Only Finds Menus The Role May Open
 * Modul    : Sidebar > Search & Collapse (U085)
 * Kategori : Positive (+) 1.5 | Security (S) 5.1-XSS-Reflected 5.1-SQLi
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SIDEBAR-SEARCH-02-Verify-Search-Is-Client-Side-Injection-Safe-And-Role-Scoped.spec.ts
 * Path     : tests/_global/sidebar-search/
 * ================================================================================
 *
 * TUJUAN:
 *   Bukti filter di klien: selama semua query diketik tidak ada SATU pun request ke server.
 *     -> item API (5.8, 6.1-6.5) & header per dokumen (5.6) tidak berlaku bagi kotak Search;
 *        matrix menandainya N/A dgn flag NOAPI berdasarkan bukti ini.
 *   5.1-XSS-Reflected  payload <img onerror> / <script> / javascript: diketik -> tidak ada dialog,
 *        tidak ada elemen <img>/<script> baru di menu, teks tidak dirender sbg HTML.
 *   5.1-SQLi  "' OR 1=1 --" -> 0 hasil, tanpa error & tanpa request.
 *   1.5  Sesi ESS: menu ESS tidak memuat Admin/PIM/Recruitment/Maintenance; mencari "Admin" ->
 *        0 hasil; "Leave" -> Leave; hasil "a" hanya modul yg boleh dibuka ESS.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sidebar-search/TC-SIDEBAR-SEARCH-02-Verify-Search-Is-Client-Side-Injection-Safe-And-Role-Scoped.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { searchSidebar, expectedMatches, sidebarItems } from '../../../src/utils/sidebarSearch';
import { newEssSession } from '../../../src/utils/myInfo';

const ADMIN_ONLY = ['Admin', 'PIM', 'Recruitment', 'Maintenance'];

test('TC-SIDEBAR-SEARCH-02: sidebar search is client-side, injection safe and role scoped', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-SIDEBAR-SEARCH-02', 'Search Client Side Injection Safe Role Scoped', env.baseURL, page);

  report.step('Admin: ketik query sambil merekam request & dialog');
  await page.goto('/web/index.php/dashboard/index');
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  const dialogs: string[] = [];
  page.on('request', (r) => { if (!/\.(png|svg|jpe?g|woff2?|css|js)(\?|$)/.test(r.url())) requests.push(`${r.method()} ${r.url().replace(/.*index\.php\//, '')}`); });
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const imgBefore = await page.locator('.oxd-sidepanel img, .oxd-sidepanel script').count();

  for (const payload of ['<img src=x onerror=alert(1)>', '"><script>alert(2)</script>', 'javascript:alert(3)']) {
    await searchSidebar(page, payload);
    const injected = await page.locator('.oxd-sidepanel img[src="x"], .oxd-sidepanel script').count();
    report.check(`5.1-XSS-Reflected Payload ${JSON.stringify(payload)} -> tidak dirender sbg HTML, tanpa dialog`, injected === 0 && dialogs.length === 0, `elemenBaru=${injected}, dialog=${dialogs.length}`);
  }
  const imgAfter = await page.locator('.oxd-sidepanel img, .oxd-sidepanel script').count();
  report.check('5.1-XSS-Reflected Jumlah <img>/<script> di sidepanel tidak bertambah', imgAfter === imgBefore, `sebelum=${imgBefore}, sesudah=${imgAfter}`);

  const sqli = await searchSidebar(page, "' OR 1=1 --");
  report.check('5.1-SQLi "\' OR 1=1 --" -> 0 hasil, tanpa error', sqli.length === 0, `hasil=${sqli.length}`);
  for (const q of ['le', 'PIM', 'zzz', 'a', '']) await searchSidebar(page, q);
  report.check('Filter berjalan di klien: semua query diketik tanpa satu pun request ke server', requests.length === 0, requests.join(' ; ') || 'tidak ada request');

  report.step('ESS: hanya menu yg boleh dibuka yg bisa ditemukan');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaSideSearch');
  try {
    await essPage.goto('/web/index.php/dashboard/index');
    await essPage.waitForLoadState('networkidle');
    const essAll = (await sidebarItems(essPage).allInnerTexts()).map((t) => t.trim());
    report.check('1.5 Menu ESS tidak memuat Admin/PIM/Recruitment/Maintenance', ADMIN_ONLY.every((m) => !essAll.includes(m)), essAll.join(', '));
    const essAdmin = await searchSidebar(essPage, 'Admin');
    report.check('1.5 ESS mencari "Admin" -> 0 hasil', essAdmin.length === 0, `hasil=${essAdmin.join(', ') || '(kosong)'}`);
    const essLeave = await searchSidebar(essPage, 'Leave');
    report.check('1.5 ESS mencari "Leave" -> Leave', JSON.stringify(essLeave) === JSON.stringify(['Leave']), essLeave.join(', '));
    const essA = await searchSidebar(essPage, 'a');
    report.check('1.5 ESS mencari "a" -> hanya modul ESS yg mengandung "a"', JSON.stringify(essA) === JSON.stringify(expectedMatches(essAll, 'a')), essA.join(', '));
  } finally {
    await close();
  }

  report.print();
});
