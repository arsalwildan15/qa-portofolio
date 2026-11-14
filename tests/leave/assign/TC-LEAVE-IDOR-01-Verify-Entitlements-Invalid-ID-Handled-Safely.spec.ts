/**
 * ================================================================================
 * TC-LEAVE-IDOR-01 — Verify Invalid Employee/Entitlement IDs Are Handled Safely
 * Modul    : Leave - API Access Control
 * Kategori : Security (S) 5.2 / Negative (-) 2.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-IDOR-01-Verify-Entitlements-Invalid-ID-Handled-Safely.spec.ts
 * Path     : tests/leave/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Melengkapi IDOR coverage modul Leave (sebelumnya baru ada utk leave-requests, lihat
 *   TC-LEAVE-LIST-02) dgn endpoint Entitlements: empNumber tidak eksis/negatif, dan DELETE
 *   entitlement dgn ID tidak eksis, semuanya harus ditolak dgn aman (4xx yg jelas), bukan
 *   500/crash/leak.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/assign/TC-LEAVE-IDOR-01-Verify-Entitlements-Invalid-ID-Handled-Safely.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-LEAVE-IDOR-01: invalid empNumber/entitlementId are rejected safely on the Leave Entitlements API', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-LEAVE-IDOR-01', 'Entitlements Invalid ID Handled Safely', env.baseURL, page);

  report.step('GET entitlements utk empNumber tidak eksis (999999)');
  const r1 = await page.request.get('/web/index.php/api/v2/leave/employees/999999/entitlements?limit=50');
  report.check('[API] empNumber tidak eksis -> 404 bersih (bukan 500/leak)', r1.status() === 404, `status=${r1.status()}`);

  report.step('GET entitlements utk empNumber negatif (-1)');
  const r2 = await page.request.get('/web/index.php/api/v2/leave/employees/-1/entitlements?limit=50');
  report.check('[API] empNumber negatif -> 404 bersih', r2.status() === 404, `status=${r2.status()}`);

  report.step('DELETE entitlement dgn ID tidak eksis (999999)');
  const r3 = await page.request.delete('/web/index.php/api/v2/leave/leave-entitlements/999999');
  report.check('[API] DELETE ID tidak eksis ditolak dgn aman (405, bukan 500/crash)', r3.status() === 405, `status=${r3.status()}`);

  report.print();
});
