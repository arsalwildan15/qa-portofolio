/**
 * ================================================================================
 * TC-INFRA-03 — Verify A Freshly-Created Second Admin Account Can Log In
 * Modul    : Infrastruktur - Fixture Multi-Role (Fase 1)
 * Kategori : Smoke (prasyarat Fase 2: cross-admin concurrency sungguhan, pengganti TC-15 lama)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-INFRA-03-Verify-Second-Admin-Login.spec.ts
 * Path     : tests/infra/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi `createSecondAdmin()` (Fase 1, src/utils/createSecondAdmin.ts) berhasil:
 *   buat employee baru, buat login ber-role Admin yg ditautkan ke employee BARU itu (bukan
 *   employee lama yg kebetulan match "a"), dan akun tsb bisa login + punya menu Admin penuh.
 *
 * RUN COMMAND:
 *   npx playwright test tests/infra/TC-INFRA-03-Verify-Second-Admin-Login.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { createSecondAdmin } from '../../src/utils/createSecondAdmin';
import { loginAs } from '../../src/utils/loginAs';

test('TC-INFRA-03: a freshly-created second Admin account is correctly linked and can log in', async ({
  page,
  browser,
  addEmployeePage,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-INFRA-03', 'Second Admin Login', env.baseURL, page);

  report.step('Buat employee baru + login Admin via createSecondAdmin()');
  const admin2 = await createSecondAdmin(page, addEmployeePage, adminUsersPage, 'QaInfraAdm');
  report.check('Akun Admin ke-2 berhasil dibuat', !!admin2.empNumber && !!admin2.username, `empNumber=${admin2.empNumber}, username=${admin2.username}`);

  report.step('[API] Verify user yg baru dibuat BENAR tertaut ke employee yg BENAR (bukan employee lama)');
  const usersResp = await page.request.get('/web/index.php/api/v2/admin/users?limit=50&offset=0');
  const usersBody = await usersResp.json().catch(() => null);
  const match = (usersBody?.data ?? []).find((u: { userName?: string }) => u.userName === admin2.username);
  report.check(
    '[API] User tertaut ke empNumber yg benar2 baru dibuat',
    match?.employee?.empNumber === admin2.empNumber,
    `expected=${admin2.empNumber}, actual=${match?.employee?.empNumber}`,
  );
  report.check('[API] Role user adalah Admin', match?.userRole?.name === 'Admin', `role=${match?.userRole?.name}`);

  report.step('Login sbg Admin ke-2 tsb di sesi browser TERPISAH');
  const { page: admin2Page, close } = await loginAs(browser, admin2.username, admin2.password);
  report.check('Login Admin ke-2 berhasil, landing di Dashboard', admin2Page.url().includes('/dashboard/index'), `url=${admin2Page.url()}`);

  // [BUG SCRIPT, diperbaiki] Lihat catatan sama di TC-INFRA-01: `.oxd-topbar-body-nav-tab`
  // kosong di Dashboard (tdk ada sub-navigasi kontekstual di sana). Menu utama ada di sidebar
  // kiri, dicek via role=link.
  await admin2Page.waitForLoadState('networkidle').catch(() => {});
  await admin2Page.waitForTimeout(1_000);
  const adminLinkVisible = await admin2Page.getByRole('link', { name: 'Admin', exact: true }).isVisible().catch(() => false);
  report.check('Link "Admin" ADA di sidebar (role Admin penuh)', adminLinkVisible);

  await close();
  report.print();
});
