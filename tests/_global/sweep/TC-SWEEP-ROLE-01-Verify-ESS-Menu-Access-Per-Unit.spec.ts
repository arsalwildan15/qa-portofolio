/**
 * ================================================================================
 * TC-SWEEP-ROLE-01 — Verify An ESS Employee Reaches Every Employee Menu And Is Refused Every Admin-Only Menu
 * Modul    : Semua menu (registry src/data/unitRegistry.ts)
 * Kategori : Positive (+) 1.5 / Negative (-) 2.4 / Security (S) 5.2-BFLAC
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-ROLE-01-Verify-ESS-Menu-Access-Per-Unit.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN:
 *   Akun ESS sungguhan (dibuat lewat Add Employee + Create Login Details, login di sesi
 *   terpisah) membuka URL SETIAP unit menu secara langsung (bukan lewat menu yg disembunyikan):
 *     - unit access 'all'   -> 1.5 halaman termuat utk ESS (bukan login / "Credential
 *                              Required", konten ada) tanpa console error.
 *     - unit access 'admin' -> 2.4 / 5.2-BFLAC ditolak: dialihkan ke luar halaman tsb,
 *                              menampilkan "Credential Required"/"Unauthorized", ATAU (utk URL yg
 *                              memuat ID record) tidak ada respons API 200 yg memuat record tsb
 *                              -> 5.2-IDOR. Kode status penolakan dicatat (6.1).
 *   ROOT CAUSE run pertama (15 Nov 2026): 11 tab PIM milik karyawan lain "tidak dialihkan" ->
 *   dibuktikan via API sbg ESS: semua endpoint pim/employees/<orang lain>/* -> 422 "Invalid
 *   Parameter" (PUT -> 404), UI hanya kerangka "No Records Found", data milik sendiri 200.
 *   Tidak ada kebocoran -> kriteria TC yg terlalu sempit, diperbaiki spt di atas.
 *   URL halaman detail admin (kandidat, vacancy, review, tracker, klaim) di-resolve memakai sesi
 *   Admin lalu dibuka oleh ESS -> sekaligus membuktikan ESS tidak bisa membuka record admin
 *   lewat URL langsung.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-ROLE-01-Verify-ESS-Menu-Access-Per-Unit.spec.ts --project=chromium
 * ================================================================================
 */

import { type Response } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { PAGE_UNITS, resolveUnitUrl } from '../../../src/data/unitRegistry';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-SWEEP-ROLE-01: an ESS employee reaches every employee menu and is refused every admin-only menu', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(PAGE_UNITS.length * 30_000);
  const report = new TestReport('TC-SWEEP-ROLE-01', 'ESS Menu Access Per Unit', env.baseURL);

  report.step('Setup: akun ESS sungguhan, login di sesi terpisah');
  const ess = await createEssAccount(page, addEmployeePage, 'QaSweepRole');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);

  // URLs are resolved with the Admin session (detail pages need admin-visible record ids).
  const urls = new Map<string, string | null>();
  for (const unit of PAGE_UNITS) {
    // Self-scoped units resolve for the ESS user, not for the Admin.
    urls.set(unit.id, unit.access === 'all' ? null : await resolveUnitUrl(page, unit));
  }

  let consoleErrors: string[] = [];
  let dataResponses: string[] = [];
  let refusedApi: string[] = [];
  essPage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  essPage.on('pageerror', (e) => consoleErrors.push(`Uncaught exception: ${e.message}`));
  essPage.on('response', async (r: Response) => {
    const t = r.request().resourceType();
    if ((t === 'xhr' || t === 'fetch') && r.url().includes('/api/v2/')) {
      const path = r.url().split('/api/v2/')[1] ?? r.url();
      if (r.status() === 200) dataResponses.push(path);
      else if (r.status() >= 400) refusedApi.push(`${r.status()} ${path.split('?')[0]}`);
    }
  });

  for (const unit of PAGE_UNITS) {
    const tag = `[${unit.id} ${unit.path}]`;
    const url = unit.access === 'all' ? await resolveUnitUrl(essPage, unit) : urls.get(unit.id) ?? null;
    if (!url) { report.finding(`${tag} dilewati`, 'tidak ada record live utk membangun URL'); continue; }
    consoleErrors = []; dataResponses = []; refusedApi = [];
    await essPage.goto(url).catch(() => {});
    await essPage.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const finalPath = essPage.url().split('/web/index.php/')[1] ?? essPage.url();
    const requested = url.split('/web/index.php/')[1] ?? url;
    const denied = await essPage.getByText(/Credential Required|Unauthorized|Access Denied/i).first().isVisible().catch(() => false);
    const onLogin = finalPath.startsWith('auth/login');
    const stayed = finalPath.split('?')[0] === requested.split('?')[0] || (requested === 'pim/viewMyDetails' && finalPath.startsWith('pim/viewPersonalDetails'));
    const contentChars = ((await essPage.locator('.oxd-layout-context').innerText().catch(() => '')) || '').trim().length;

    if (unit.access === 'all') {
      report.check(`${tag} 1.5 ESS dapat membuka menu karyawan (termuat, konten ada)`, stayed && !denied && !onLogin && contentChars > 0, `final=${finalPath}, contentChars=${contentChars}`);
      report.check(`${tag} 7.1 Tidak ada console error (ESS)`, consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    } else {
      // For a URL keyed by a record id (e.g. another employee's PIM tab) the app may render the page
      // shell but must not hand that record's data to the ESS session: confirmed live 2026-11-15 that
      // PIM tab APIs answer other employees' empNumber with 422 and the page shows "No Records Found".
      const id = /\/(\d+)(?:[/?#]|$)/.exec(requested)?.[1] ?? '';
      const idInPath = new RegExp(`(^|/)${id}(/|$)`);
      const leakedResponses = id ? dataResponses.filter((u) => idInPath.test(u.split('?')[0] ?? '')) : [];
      const recordLeaked = leakedResponses.length > 0;
      const refused = denied || onLogin || !stayed || (id !== '' && !recordLeaked);
      report.check(`${tag} 2.4 / 5.2-BFLAC Menu admin-only ditolak utk ESS (dialihkan/ditolak, atau data record tidak diberikan)`, refused && !recordLeaked, `final=${finalPath}, deniedText=${denied}, recordLeaked=${recordLeaked}`);
      if (id) report.check(`${tag} 5.2-IDOR Data record id ${id} tidak diberikan ke ESS`, !recordLeaked, `200s=${leakedResponses.slice(0, 2).join(' | ')}`);
      report.finding(`${tag} Cara penolakan`, denied ? 'pesan Credential Required/Unauthorized' : onLogin ? 'dialihkan ke login' : !stayed ? `dialihkan ke ${finalPath}` : `halaman kosong; API menolak: ${refusedApi.slice(0, 2).join(' | ') || '(tak ada request data)'}`);
      if (refusedApi.some((x) => x.startsWith('422'))) report.finding(`${tag} 6.1 Kode status penolakan`, `422 "Invalid Parameter" (bukan 403) -- inkonsisten dgn modul lain yg memakai 403`);
    }
  }

  await close();
  report.print();
});
