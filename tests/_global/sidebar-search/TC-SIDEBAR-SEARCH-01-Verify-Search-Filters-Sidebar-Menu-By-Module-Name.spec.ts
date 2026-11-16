/**
 * ================================================================================
 * TC-SIDEBAR-SEARCH-01 — Verify The Sidebar Search Filters The Menu By Module Name, Including Zero, One And Many Results
 * Modul    : Sidebar > Search & Collapse (U085)
 * Kategori : Positive (+) 1.1-R 1.6 | Boundary (B) 3.6 | Edge (!) 4.1 4.6 4.8
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SIDEBAR-SEARCH-01-Verify-Search-Filters-Sidebar-Menu-By-Module-Name.spec.ts
 * Path     : tests/_global/sidebar-search/
 * ================================================================================
 *
 * TUJUAN (sesi Admin, halaman Dashboard):
 *   1.1-R  Tanpa query -> 12 modul sidebar tampil (Admin..Buzz) sesuai urutan menu.
 *   1.6    "le" -> hanya Leave; "LEAVE" (huruf besar) -> Leave (case-insensitive);
 *          "ime" (potongan di tengah) -> Time.
 *   3.6    0 hasil ("zzz"), 1 hasil ("Buzz"), banyak hasil ("a") = persis modul yg mengandung "a".
 *   4.6    0 hasil -> menu kosong; ada/tidaknya teks empty state dicatat.
 *   4.8    Nama sub-menu ("Leave List") -> 0 hasil: pencarian HANYA atas nama modul (known behaviour);
 *          Enter di kotak Search tidak berpindah halaman.
 *   4.1    Spasi saja, Arab, emoji, 300 karakter -> tanpa error; hapus query -> 12 modul kembali.
 *   1.1-R  Klik hasil filter "Leave" -> membuka modul Leave.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sidebar-search/TC-SIDEBAR-SEARCH-01-Verify-Search-Filters-Sidebar-Menu-By-Module-Name.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { searchSidebar, expectedMatches, sidebarItems, sidebarSearchBox } from '../../../src/utils/sidebarSearch';

const MODULES = ['Admin', 'PIM', 'Leave', 'Time', 'Recruitment', 'My Info', 'Performance', 'Dashboard', 'Directory', 'Maintenance', 'Claim', 'Buzz'];
const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

test('TC-SIDEBAR-SEARCH-01: sidebar search filters the menu by module name', async ({ page }) => {
  const report = new TestReport('TC-SIDEBAR-SEARCH-01', 'Search Filters Sidebar Menu By Module Name', env.baseURL, page);

  report.step('Buka Dashboard sebagai Admin');
  await page.goto('/web/index.php/dashboard/index');
  await page.waitForLoadState('networkidle');
  const all = (await sidebarItems(page).allInnerTexts()).map((t) => t.trim());
  report.check('1.1-R Tanpa query -> 12 modul sidebar tampil berurutan', same(all, MODULES), all.join(', '));

  report.step('Pencocokan nama modul');
  for (const [q, want] of [['le', ['Leave']], ['LEAVE', ['Leave']], ['ime', ['Time']]] as const) {
    const got = await searchSidebar(page, q);
    report.check(`1.6 Query "${q}" -> ${want.join(', ')}`, same(got, [...want]), `hasil=${got.join(', ') || '(kosong)'}`);
  }

  report.step('Jumlah hasil 0 / 1 / banyak');
  const one = await searchSidebar(page, 'Buzz');
  report.check('3.6 Tepat 1 hasil: "Buzz" -> Buzz', same(one, ['Buzz']), one.join(', '));
  const many = await searchSidebar(page, 'a');
  report.check('3.6 Banyak hasil: "a" -> persis modul yg mengandung "a" (case-insensitive)', same(many, expectedMatches(MODULES, 'a')), `hasil=${many.join(', ')}`);
  const none = await searchSidebar(page, 'zzz');
  report.check('3.6 / 4.6 0 hasil: "zzz" -> menu kosong, halaman tetap normal', none.length === 0 && (await sidebarSearchBox(page).isVisible()), `hasil=${none.length}`);
  const emptyText = (await page.locator('.oxd-sidepanel-body .oxd-main-menu').first().innerText()).trim();
  report.finding('4.6 Empty state pencarian sidebar', emptyText ? `teks: "${emptyText}"` : 'menu kosong tanpa teks "No results" (pengguna hanya melihat sidebar kosong)');

  report.step('Perilaku non-obvious');
  const sub = await searchSidebar(page, 'Leave List');
  report.check('4.8 Nama sub-menu "Leave List" -> 0 hasil (pencarian hanya atas nama modul, known behaviour)', sub.length === 0, `hasil=${sub.join(', ') || '(kosong)'}`);
  await searchSidebar(page, 'PIM');
  const before = page.url();
  await sidebarSearchBox(page).press('Enter');
  await page.waitForLoadState('networkidle');
  report.check('4.8 Enter di kotak Search tidak berpindah halaman (harus klik hasil)', page.url() === before, page.url());

  report.step('Input tidak biasa');
  for (const [q, label] of [['مرحبا', 'Arab (RTL)'], ['🚀', 'emoji'], ['X'.repeat(300), '300 karakter']] as const) {
    const got = await searchSidebar(page, q);
    report.check(`4.1 Query ${label} -> tanpa error, 0 hasil`, got.length === 0 && (await sidebarSearchBox(page).inputValue()) === q, `hasil=${got.length}`);
  }
  const spaces = await searchSidebar(page, '   ');
  report.finding('4.1 Query spasi saja', spaces.length === 0 ? 'tidak di-trim: spasi dicocokkan apa adanya sehingga semua modul tersembunyi' : `di-trim, ${spaces.length} modul tampil`);
  const cleared = await searchSidebar(page, '');
  report.check('1.1-R Query dihapus -> 12 modul kembali', same(cleared, MODULES), cleared.join(', '));

  report.step('Klik hasil filter');
  await searchSidebar(page, 'Leave');
  await sidebarItems(page).filter({ hasText: 'Leave' }).click();
  await page.waitForURL(/\/leave\//, { timeout: 30_000 }).catch(() => {});
  report.check('1.1-R Klik hasil "Leave" -> modul Leave terbuka', /\/leave\//.test(page.url()), page.url());

  report.print();
});
