/**
 * ================================================================================
 * TC-LEAVE-ENT-01 — Verify An Entitlement Added By Admin Becomes The ESS Employee's Balance
 * Modul    : Leave - Entitlements (Admin) + Balance (ESS)
 * Kategori : Positive (+) 1.1-C 1.4 1.5 | API (A) 6.1 -- Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-ENT-01-Verify-Add-Entitlement-Visible-To-ESS.spec.ts
 * Path     : tests/leave/entitlements/
 * ================================================================================
 *
 * TUJUAN:
 *   Admin menambah entitlement 5 hari "US - Vacation" lewat UI Add Entitlement utk akun ESS
 *   baru (tanpa entitlement sebelumnya) -> POST 200, dan saldo yg dilihat ESS sendiri
 *   (GET leave-balance/leave-type/1 dari sesi ESS) = 5, dan form Apply Leave ESS tidak lagi
 *   menampilkan "No Leave Types with Leave Balance".
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/entitlements/TC-LEAVE-ENT-01-Verify-Add-Entitlement-Visible-To-ESS.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { ApplyLeavePage } from '../../../src/pages';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-LEAVE-ENT-01: an entitlement added by Admin becomes the ESS employee\'s visible balance', async ({
  page,
  browser,
  addEmployeePage,
  leaveEntitlementPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-LEAVE-ENT-01', 'Add Entitlement Visible To ESS', env.baseURL, page);

  report.step('Setup: akun ESS baru (belum punya entitlement)');
  const ess = await createEssAccount(page, addEmployeePage, 'QaLvEnt');
  const lastName = ess.fullName.split(' ').pop() ?? ess.fullName;

  report.step('[ESS] Sebelum entitlement: Apply Leave menampilkan "No Leave Types with Leave Balance"');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  const applyLeavePage = new ApplyLeavePage(essPage);
  await applyLeavePage.goto();
  const emptyBefore = await isVisibleWithWait(applyLeavePage.noLeaveTypesMessage, 15_000);
  report.check('Sebelum: "No Leave Types with Leave Balance" tampil', emptyBefore);

  report.step('[Admin UI] Add Entitlement 5 hari US - Vacation (cari employee via lastName unik)');
  const { employeeName, status } = await createLeaveEntitlement(leaveEntitlementPage, lastName, 'US - Vacation', '5');
  report.check('[API] POST leave-entitlements 200', status === 200, `status=${status}`);
  report.check('Entitlement ter-assign ke employee yg benar', employeeName.includes(lastName), `matched="${employeeName}"`);

  report.step('[ESS] Saldo terlihat dari sesi ESS');
  const bal = await (await essPage.request.get('/web/index.php/api/v2/leave/leave-balance/leave-type/1')).json().catch(() => null);
  report.check('Saldo ESS = 5', bal?.data?.balance?.balance === 5, `balance=${JSON.stringify(bal?.data?.balance)}`);
  await applyLeavePage.goto();
  const formShown = await isVisibleWithWait(applyLeavePage.leaveTypeSelect, 15_000);
  const emptyAfter = await applyLeavePage.noLeaveTypesMessage.isVisible();
  report.check('Sesudah: form Apply Leave tersedia (dropdown Leave Type tampil, pesan kosong hilang)', formShown && !emptyAfter, `formShown=${formShown}, emptyMsg=${emptyAfter}`);

  await close();
  report.print();
});
