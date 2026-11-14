/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-05 — Verify Required Field Validation On Create Claim Request
 * Modul    : Claim - Assign Claim
 * Kategori : Negative (-) 2.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-05-Verify-Required-Field-Validation.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Create Claim Request tanpa mengisi field wajib apapun
 *   (Employee Name, Event, Currency) menampilkan error "Required" di ketiga field dan TIDAK
 *   mengirim request POST apapun ke server.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-05-Verify-Required-Field-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-CLAIM-ASSIGN-05: submitting Create Claim Request with no fields filled shows Required errors and sends no POST', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-05', 'Required Field Validation', env.baseURL, page);

  report.step('Buka form Create, langsung klik Create tanpa isi apapun');
  await assignClaimPage.goto();
  await page.waitForTimeout(1_000);
  let postFired = false;
  page.on('request', (r) => {
    if (r.url().includes('/api/v2/claim/') && r.method() === 'POST') postFired = true;
  });
  await assignClaimPage.createButton.click();
  await page.waitForTimeout(1_000);

  report.step('Verify: error "Required" muncul utk Employee Name/Event/Currency, tidak ada POST terkirim');
  const bodyText = await page.locator('body').innerText();
  const requiredCount = (bodyText.match(/Required/g) ?? []).length;
  report.check('Minimal 3 pesan "Required" muncul (Employee Name, Event, Currency)', requiredCount >= 3, `requiredCount=${requiredCount}`);
  report.check('TIDAK ada POST /api/v2/claim/ terkirim', postFired === false);

  report.print();
});
