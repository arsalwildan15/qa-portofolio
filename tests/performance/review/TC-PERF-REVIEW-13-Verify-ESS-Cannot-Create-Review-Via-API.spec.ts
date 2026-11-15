/**
 * ================================================================================
 * TC-PERF-REVIEW-13 — Verify An ESS Account Cannot Create/Activate A Review Via Direct API Call
 * Modul    : Performance - Manage Reviews - Access Control
 * Kategori : Security (S) / Broken Function-Level Access Control
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-REVIEW-13-Verify-ESS-Cannot-Create-Review-Via-API.spec.ts
 * Path     : tests/performance/review/
 * ================================================================================
 *
 * TUJUAN:
 *   "Manage Reviews" adalah fitur Admin/Supervisor -- menu ini TIDAK ADA di sidebar ESS
 *   (confirmed TC-INFRA-01). Tapi menu yg disembunyikan di UI bukan bukti endpoint-nya aman.
 *   TC ini memverifikasi endpoint POST (create review) dan PUT (activate review) ditolak kalau
 *   dipanggil LANGSUNG oleh sesi ESS, bukan cuma disembunyikan dari UI-nya (BFLAC check).
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/review/TC-PERF-REVIEW-13-Verify-ESS-Cannot-Create-Review-Via-API.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-PERF-REVIEW-13: an ESS account cannot create or activate a review via direct API call', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-REVIEW-13', 'ESS Cannot Create Review Via API', env.baseURL, page);

  report.step('Buat akun ESS baru, login di sesi terpisah');
  const ess = await createEssAccount(page, addEmployeePage, 'QaRevBflac');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);

  report.step('[API, sbg ESS] Coba POST create review utk diri sendiri');
  const createResp = await essPage.request.post('/web/index.php/api/v2/performance/manage/reviews', {
    data: {
      empNumber: ess.empNumber,
      reviewerEmpNumber: ess.empNumber,
      reviewPeriodStart: '2026-01-01',
      reviewPeriodEnd: '2026-06-30',
      dueDate: '2026-07-15',
    },
  });
  report.check('[API] POST create review sbg ESS TIDAK 200', createResp.status() !== 200, `status=${createResp.status()}`);

  report.step('[API] Coba PUT activate review id acak (sembarang id yg mungkin ada) sbg ESS');
  const activateResp = await essPage.request.put('/web/index.php/api/v2/performance/manage/reviews/1', {
    data: { activate: true },
  });
  report.check('[API] PUT activate sbg ESS TIDAK 200', activateResp.status() !== 200, `status=${activateResp.status()}`);

  await close();
  report.print();
});
