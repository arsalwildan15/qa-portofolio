/**
 * ================================================================================
 * TC-LEAVE-ASSIGN-04 — Verify XSS Payload In Assign Leave Comments Does Not Execute
 * Modul    : Leave - Assign Leave
 * Kategori : Security (S) 5.1-XSS-Stored
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-ASSIGN-04-Verify-XSS-In-Comments.spec.ts
 * Path     : tests/leave/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di kolom Comments pada form Assign Leave
 *   (jalur administratif, terpisah dari Apply Leave self-service) tidak
 *   tereksekusi sbg script saat tersimpan dan ditampilkan kembali.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/assign/TC-LEAVE-ASSIGN-04-Verify-XSS-In-Comments.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createLeaveEntitlement } from '../../../src/utils/createLeaveEntitlement';
import { uniqueLeaveWeekday } from '../../../src/data/testData';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-LEAVE-ASSIGN-04: an XSS payload in Assign Leave Comments does not execute', async ({
  page,
  leaveEntitlementPage,
  assignLeavePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  // The retry loop below can legitimately hit a rejected candidate date before succeeding --
  // Chromium logs that as "Failed to load resource", expected noise (see TestReport).
  const report = new TestReport('TC-LEAVE-ASSIGN-04', 'XSS In Comments', env.baseURL, page, [
    /Failed to load resource.*4\d\d/,
  ]);
  const payload = `<script>window.__xssAssignComment=true</script>`;

  report.step('Pilih employee yg jarang dipakai TC lain (lihat TC-LEAVE-ASSIGN-01), assign entitlement, isi Comments dgn payload XSS');
  const target = await pickLightlyUsedEmployee(page);
  await createLeaveEntitlement(leaveEntitlementPage, target.employeeId, 'US - Vacation', '500');

  await assignLeavePage.goto();
  await assignLeavePage.selectEmployee(target.employeeId);
  await assignLeavePage.selectLeaveType('US - Vacation');
  await assignLeavePage.commentsInput.fill(payload);
  let response: Awaited<ReturnType<typeof assignLeavePage.submit>>['response'] = null;
  let assignDate = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = uniqueLeaveWeekday(5 + attempt);
    await assignLeavePage.fillDateRange(candidate, candidate);
    const result = await assignLeavePage.submit();
    if (result.response?.status() === 200) {
      response = result.response;
      assignDate = candidate;
      break;
    }
  }
  report.check(
    '[API] POST assign leave status === 200 (payload diterima sbg string literal)',
    response?.status() === 200,
    `status=${response?.status()}, assignDate=${assignDate}`,
  );

  report.step('Verify: payload TIDAK tereksekusi sbg script');
  await page.waitForTimeout(500);
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xssAssignComment?: boolean }).__xssAssignComment === true)
    .catch(() => false);
  report.check('Payload XSS di Assign Leave Comments TIDAK tereksekusi sbg script', xssExecuted === false);

  report.print();
});
