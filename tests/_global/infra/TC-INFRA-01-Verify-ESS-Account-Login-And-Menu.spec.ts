/**
 * ================================================================================
 * TC-INFRA-01 — Verify A Freshly-Created ESS Account Can Log In With A Different Menu Than Admin
 * Modul    : Infrastruktur - Fixture Multi-Role (Fase 1)
 * Kategori : Smoke (prasyarat Fase 2: approval flow, access control ESS)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-INFRA-01-Verify-ESS-Account-Login-And-Menu.spec.ts
 * Path     : tests/_global/infra/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi `createEssAccount()` (Fase 1, src/utils/createEssAccount.ts) benar2 bisa:
 *   membuat employee+login ESS baru, login sbg akun tsb di sesi TERPISAH (via `loginAs()`), dan
 *   confirm menu/akses ESS BERBEDA dari Admin (tidak ada tab "Admin", tidak ada "PIM").
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/infra/TC-INFRA-01-Verify-ESS-Account-Login-And-Menu.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-INFRA-01: a freshly-created ESS account logs in with a different menu than Admin', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-INFRA-01', 'ESS Account Login And Menu', env.baseURL, page);

  report.step('Buat employee+login ESS baru via createEssAccount()');
  const ess = await createEssAccount(page, addEmployeePage, 'QaInfraEss');
  report.check('Akun ESS berhasil dibuat', !!ess.empNumber && !!ess.username, `empNumber=${ess.empNumber}, username=${ess.username}`);

  report.step('Login sbg akun ESS tsb di sesi browser TERPISAH');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  report.check('Login ESS berhasil, landing di Dashboard', essPage.url().includes('/dashboard/index'), `url=${essPage.url()}`);

  // [BUG SCRIPT, diperbaiki] `.oxd-topbar-body-nav-tab` adalah tab KONTEKSTUAL yg cuma muncul
  // di DALAM modul yg punya sub-navigasi (mis. PIM > Employee List/Add Employee/Configuration)
  // -- di halaman Dashboard tdk ada tab sejenis sama sekali, jadi locator ini SELALU kosong di
  // sana. Menu UTAMA yg membedakan ESS vs Admin ada di SIDEBAR KIRI (dikonfirmasi live via
  // screenshot: ESS sidebar HANYA Search/Leave/Time/My Info/Performance/Dashboard/Directory/
  // Claim/Buzz -- TIDAK ADA Admin/PIM/Recruitment/Maintenance). Dicek via role=link, pola yg
  // sama persis dgn TC-ADMIN-MODULES-05.
  report.step('Verify: sidebar ESS TIDAK punya link Admin/PIM (berbeda dari Admin)');
  await essPage.waitForLoadState('networkidle').catch(() => {});
  await essPage.waitForTimeout(1_000);
  const adminLinkVisible = await essPage.getByRole('link', { name: 'Admin', exact: true }).isVisible().catch(() => false);
  const pimLinkVisible = await essPage.getByRole('link', { name: 'PIM', exact: true }).isVisible().catch(() => false);
  const myInfoLinkVisible = await essPage.getByRole('link', { name: 'My Info', exact: true }).isVisible().catch(() => false);
  report.check('Link "Admin" TIDAK ada di sidebar ESS', !adminLinkVisible);
  report.check('Link "PIM" TIDAK ada di sidebar ESS', !pimLinkVisible);
  report.check('Link "My Info" ADA di sidebar ESS (akses self-service)', myInfoLinkVisible);

  await close();
  report.print();
});
