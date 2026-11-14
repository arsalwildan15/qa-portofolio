/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-01 — Verify Creating A Claim Request With Valid Data Succeeds
 * Modul    : Claim - Assign Claim
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-01-Verify-Create-Claim-Valid.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi admin membuat claim request baru utk seorang employee
 *   (Event + Currency) dgn data valid berhasil tersimpan dan muncul di
 *   daftar Assign Claim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-01-Verify-Create-Claim-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-CLAIM-ASSIGN-01: creating a claim request with valid data succeeds', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-01', 'Create Claim Valid', env.baseURL, page);

  report.step('Pilih employee, Event "Travel Allowance", Currency, buat claim baru');
  const target = await pickLightlyUsedEmployee(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Travel Allowance');
  await assignClaimPage.selectCurrencyByIndex(1);
  const resp = await assignClaimPage.create();
  report.check('[API] POST claim/employees/<empNumber>/requests status === 200', resp?.status() === 200, `status=${resp?.status()}, employee=${target.fullName}`);

  report.step('Verify: claim baru muncul di daftar Assign Claim dgn status "Initiated"');
  const body = await resp?.json().catch(() => null);
  const newClaimRef = body?.data?.referenceId;
  await page.goto('/web/index.php/claim/viewAssignClaim');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2_000);
  const bodyText = await page.locator('body').innerText();
  report.check(
    'Reference ID claim baru muncul di daftar',
    !!newClaimRef && bodyText.includes(newClaimRef),
    `newClaimRef=${newClaimRef}`,
  );

  report.print();
});
