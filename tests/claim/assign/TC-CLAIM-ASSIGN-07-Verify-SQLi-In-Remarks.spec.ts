/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-07 — Verify SQL Injection Payload In Claim Remarks Does Not Execute
 * Modul    : Claim - Assign Claim
 * Kategori : Security (S) 5.1 - SQL Injection
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-07-Verify-SQLi-In-Remarks.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL Injection klasik di kolom Remarks pada form Assign Claim
 *   tersimpan sbg string literal, tidak menyebabkan DB error leak, dan tidak membuat sistem
 *   berperilaku abnormal (mis. bypass validasi/logic lain).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-07-Verify-SQLi-In-Remarks.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-CLAIM-ASSIGN-07: a SQL injection payload in Claim Remarks does not execute or leak DB errors', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-07', 'SQLi In Remarks', env.baseURL, page);
  const payload = "' OR '1'='1'; DROP TABLE ohrm_claim_request; --";

  report.step('Pilih employee, isi Remarks dgn payload SQLi, buat claim baru');
  const target = await pickLightlyUsedEmployee(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Medical Reimbursement');
  await assignClaimPage.selectCurrencyByIndex(1);
  await assignClaimPage.remarksInput.fill(payload);
  const resp = await assignClaimPage.create();
  const body = await resp?.json().catch(() => null);
  report.check('[API] POST claim request status === 200 (payload diterima sbg string literal)', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('[API] Response remarks === payload literal (tidak dieksekusi sbg SQL)', body?.data?.remarks === payload, `remarks=${body?.data?.remarks}`);

  report.step('Verify: tidak ada DB error leak, Employee Claims list masih berfungsi normal setelahnya');
  await page.goto('/web/index.php/claim/viewAssignClaim');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_500);
  const bodyText = await page.locator('body').innerText();
  report.check(
    'Tidak ada DB error leak (SQLSTATE, mysql, syntax error) di halaman',
    !/SQLSTATE|mysql_|syntax error|SQL syntax/i.test(bodyText),
  );
  report.check('Employee Claims list masih menampilkan data (tidak crash)', bodyText.includes('Records Found'));

  report.print();
});
