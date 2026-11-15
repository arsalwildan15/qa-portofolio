/**
 * ================================================================================
 * TC-LEAVE-APPLY-10 — Verify A Leave Request Overlapping An Existing One Is Rejected
 * Modul    : Leave - Apply Leave (ESS, API)
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-10-Verify-Overlapping-Request-Rejected.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   ESS sudah punya request Pending (setengah hari pagi) pada tanggal X. Request kedua pada
 *   tanggal yg sama -- baik full day maupun half day afternoon yg secara jam tidak bertabrakan
 *   -- diuji. Confirmed live: full day pada X ditolak 400 "Overlapping Leave Request Found";
 *   saldo hanya terpotong oleh request pertama. Hasil utk half day afternoon direkam sbg
 *   finding (perilaku pasangan pagi+sore yg sah).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-10-Verify-Overlapping-Request-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssLeaveRequest } from '../../../src/utils/createEssLeaveRequest';

test('TC-LEAVE-APPLY-10: a full-day request overlapping an existing request on the same date is rejected', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  // The overlap rejection is the app's own 400 to a request THIS TC deliberately sends via
  // page.request (no console noise), so no whitelist is needed.
  const report = new TestReport('TC-LEAVE-APPLY-10', 'Overlapping Request Rejected', env.baseURL, page);

  report.step('Setup: ESS + entitlement 10 hari, tanpa request');
  const { essPage, close, date } = await createEssLeaveRequest(page, browser, addEmployeePage, 'QaLvOverlap', { apply: false, daysFromNow: 25 });
  const balance = async () => (await (await essPage.request.get('/web/index.php/api/v2/leave/leave-balance/leave-type/1')).json().catch(() => null))?.data?.balance?.balance;
  const apply = (type: string) => essPage.request.post('/web/index.php/api/v2/leave/leave-requests', {
    data: { leaveTypeId: 1, fromDate: date, toDate: date, comment: null, duration: { type } },
  });

  report.step('[ESS API] Request pertama: half day morning');
  const first = await apply('half_day_morning');
  report.check('Request pertama 200', first.status() === 200, `status=${first.status()}`);
  report.check('Saldo 9.5', (await balance()) === 9.5, `balance=${await balance()}`);

  report.step('[ESS API] Request kedua full day pada tanggal yg sama');
  const second = await apply('full_day');
  const body = await second.json().catch(() => null);
  report.check('Full day yg tumpang tindih ditolak 400', second.status() === 400, `status=${second.status()}`);
  report.check('Pesan "Overlapping Leave Request Found"', /Overlapping Leave Request Found/.test(body?.error?.message ?? ''), `message=${body?.error?.message}`);
  report.check('Saldo tetap 9.5', (await balance()) === 9.5, `balance=${await balance()}`);

  report.step('[ESS API, observasi] Half day afternoon pada tanggal yg sama');
  const afternoon = await apply('half_day_afternoon');
  report.finding('Half day afternoon setelah half day morning pd tanggal sama', `status=${afternoon.status()}, saldo=${await balance()}`);

  await close();
  report.print();
});
