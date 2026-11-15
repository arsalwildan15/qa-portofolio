/**
 * ================================================================================
 * TC-LEAVE-APPLY-08 — Verify "Specify Time" Leave Accepts A Valid Range And Rejects Reversed/Zero Ranges
 * Modul    : Leave - Apply Leave (ESS, API)
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-08-Verify-Specify-Time-Range-Boundary.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Duration "Specify Time" (POST leave-requests duration {type:"specify_time", fromTime, toTime},
 *   confirmed live): 09:00-13:00 (4 jam) diterima & memotong 0.5 hari (hari kerja 8 jam);
 *   rentang terbalik (13:00-09:00) dan rentang nol (09:00-09:00) ditolak 422 "Invalid
 *   Parameter" [duration] tanpa memotong saldo.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-08-Verify-Specify-Time-Range-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssLeaveRequest } from '../../../src/utils/createEssLeaveRequest';

test('TC-LEAVE-APPLY-08: specify-time leave accepts 09:00-13:00 and rejects reversed or zero-length ranges', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-LEAVE-APPLY-08', 'Specify Time Range Boundary', env.baseURL, page);

  report.step('Setup: ESS + entitlement 10 hari');
  const { essPage, close, date } = await createEssLeaveRequest(page, browser, addEmployeePage, 'QaLvTime', { apply: false, daysFromNow: 24 });
  const balance = async () => (await (await essPage.request.get('/web/index.php/api/v2/leave/leave-balance/leave-type/1')).json().catch(() => null))?.data?.balance?.balance;
  const apply = (fromTime: string, toTime: string) => essPage.request.post('/web/index.php/api/v2/leave/leave-requests', {
    data: { leaveTypeId: 1, fromDate: date, toDate: date, comment: null, duration: { type: 'specify_time', fromTime, toTime } },
  });

  report.step('[ESS API] Rentang terbalik 13:00-09:00 dan rentang nol 09:00-09:00');
  const reversed = await apply('13:00', '09:00');
  report.check('Rentang terbalik ditolak 422', reversed.status() === 422, `status=${reversed.status()}`);
  const zero = await apply('09:00', '09:00');
  report.check('Rentang nol ditolak 422', zero.status() === 422, `status=${zero.status()}`);
  report.check('Saldo tetap 10 setelah 2 penolakan', (await balance()) === 10, `balance=${await balance()}`);

  report.step('[ESS API] Rentang valid 09:00-13:00 (4 jam)');
  const valid = await apply('09:00', '13:00');
  report.check('Rentang valid diterima 200', valid.status() === 200, `status=${valid.status()}`);
  report.check('Saldo terpotong 0.5 hari (4 jam dari 8 jam kerja) -> 9.5', (await balance()) === 9.5, `balance=${await balance()}`);

  await close();
  report.print();
});
