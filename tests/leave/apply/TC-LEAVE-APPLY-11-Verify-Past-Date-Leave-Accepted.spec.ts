/**
 * ================================================================================
 * TC-LEAVE-APPLY-11 — Verify A Retroactive (Past-Date) Leave Request Is Accepted And Deducted
 * Modul    : Leave - Apply Leave (ESS, API)
 * Kategori : Boundary (B) 3.4 | Edge Case (!) 4.8 -- Design Behavior
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-11-Verify-Past-Date-Leave-Accepted.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Confirmed live: ESS boleh mengajukan cuti utk tanggal yg SUDAH LEWAT (dlm periode cuti
 *   berjalan) -- 200, saldo terpotong. Ini perilaku desain OrangeHRM (mencatat cuti yg sudah
 *   diambil), BUKAN bug; TC ini mengunci perilaku tsb supaya perubahan aturan terdeteksi, dan
 *   merekam status awal request lampau sbg finding.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-11-Verify-Past-Date-Leave-Accepted.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssLeaveRequest, getEssLeaveRequest, isoWeekday } from '../../../src/utils/createEssLeaveRequest';

test('TC-LEAVE-APPLY-11: a retroactive (past-date) leave request is accepted and deducted', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-LEAVE-APPLY-11', 'Past Date Leave Accepted', env.baseURL, page);

  report.step('Setup: ESS + entitlement 10 hari');
  const { essPage, close } = await createEssLeaveRequest(page, browser, addEmployeePage, 'QaLvPast', { apply: false });
  const pastDate = isoWeekday(-20);
  report.finding('Tanggal lampau yg dipakai', pastDate);

  report.step('[ESS API] Apply 1 hari pada tanggal lampau');
  const resp = await essPage.request.post('/web/index.php/api/v2/leave/leave-requests', {
    data: { leaveTypeId: 1, fromDate: pastDate, toDate: pastDate, comment: null, duration: { type: 'full_day' } },
  });
  const id = (await resp.json().catch(() => null))?.data?.id as number | undefined;
  report.check('Request tanggal lampau diterima 200', resp.status() === 200 && !!id, `status=${resp.status()}, id=${id}`);

  if (id) {
    const view = await getEssLeaveRequest(essPage, id);
    report.check('Saldo terpotong 1 hari -> 9', view.balance === 9, `balance=${view.balance}`);
    report.finding('Status awal request tanggal lampau', `${view.status} (actions=${JSON.stringify(view.actions)})`);
  }

  await close();
  report.print();
});
