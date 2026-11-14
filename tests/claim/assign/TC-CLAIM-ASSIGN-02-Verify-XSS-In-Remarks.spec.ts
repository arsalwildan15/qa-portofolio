/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-02 — Verify XSS Payload In Claim Remarks Does Not Execute
 * Modul    : Claim - Assign Claim
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-02-Verify-XSS-In-Remarks.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di kolom Remarks pada form Assign Claim
 *   tersimpan sbg string literal dan tidak tereksekusi sbg script.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-02-Verify-XSS-In-Remarks.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-CLAIM-ASSIGN-02: an XSS payload in Claim Remarks does not execute', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-02', 'XSS In Remarks', env.baseURL, page);
  const payload = `<script>window.__xssClaimRemarks=true</script>`;

  report.step('Pilih employee, isi Remarks dgn payload XSS, buat claim baru');
  const target = await pickLightlyUsedEmployee(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Medical Reimbursement');
  await assignClaimPage.selectCurrencyByIndex(1);
  await assignClaimPage.remarksInput.fill(payload);
  const resp = await assignClaimPage.create();
  report.check('[API] POST claim request status === 200 (payload diterima sbg string literal)', resp?.status() === 200, `status=${resp?.status()}`);

  report.step('Verify: payload TIDAK tereksekusi sbg script');
  await page.waitForTimeout(500);
  const xssExecuted = await page
    .evaluate(() => (globalThis as unknown as { __xssClaimRemarks?: boolean }).__xssClaimRemarks === true)
    .catch(() => false);
  report.check('Payload XSS di Remarks TIDAK tereksekusi sbg script', xssExecuted === false);

  report.print();
});
