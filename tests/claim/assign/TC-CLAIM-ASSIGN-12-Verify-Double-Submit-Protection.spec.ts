/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-12 — Verify Double-Click Submit Does Not Create Duplicate Expense Rows
 * Modul    : Claim - Assign Claim (Expense detail)
 * Kategori : Edge Case (!) 4.2 - Aksi Ganda/Cepat (Double Submission)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-12-Verify-Double-Submit-Protection.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Save berulang cepat (double-click) pada dialog Add Expense tidak
 *   menghasilkan 2 baris expense ganda.
 *
 * [TEMUAN POSITIF, dikonfirmasi live] Form ini menampilkan loading overlay
 * (`.oxd-form-loader`) SEGERA setelah klik pertama, yg secara fisik memblokir pointer event
 * apapun thd tombol Save -- klik kedua yg menyusul CEPAT akan gagal menjangkau tombol sama
 * sekali (Playwright sendiri melempar "element intercepts pointer events" saat mencoba
 * memaksa klik kedua). Ini mekanisme proteksi double-submit yg BEKERJA, bukan diasumsikan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-12-Verify-Double-Submit-Protection.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-CLAIM-ASSIGN-12: a loading overlay blocks a rapid second click on Save, preventing duplicate expense rows', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-12', 'Double Submit Protection', env.baseURL, page);

  report.step('Buat claim baru, buka dialog Add Expense, isi data valid');
  const target = await pickLightlyUsedEmployee(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Travel Allowance');
  await assignClaimPage.selectCurrencyByIndex(1);
  const createResp = await assignClaimPage.create();
  const claimId = (await createResp?.json().catch(() => null))?.data?.id;
  await assignClaimPage.gotoDetail(claimId);

  let postCount = 0;
  page.on('request', (r) => {
    if (/\/api\/v2\/claim\/requests\/\d+\/expenses/.test(r.url()) && r.method() === 'POST') postCount += 1;
  });

  await assignClaimPage.addExpenseButton.click();
  const dialog = page.locator('.oxd-dialog-container, [role="dialog"]').last();
  await dialog.locator('.oxd-select-text').click();
  const option = page.locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]').filter({ hasText: 'Accommodation' });
  await option.first().waitFor({ state: 'visible', timeout: 5_000 });
  await option.first().click();
  const inputs = dialog.locator('input');
  await inputs.nth(0).fill('2026-30-11');
  await inputs.nth(1).fill('100');
  await dialog.locator('textarea').fill('double click test');

  report.step('Klik Save dua kali secara cepat berturut-turut (TANPA force, perilaku klik wajar)');
  const saveBtn = dialog.getByRole('button', { name: 'Save' });
  await saveBtn.click();
  // A genuine rapid second click (not forced past the loading overlay) -- Playwright's
  // actionability check will naturally wait/skip if the overlay is blocking, same as a real
  // user's second click landing on a disabled/covered button.
  await saveBtn.click({ timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  report.step('Verify: hanya 1 POST expenses terkirim, hanya 1 baris expense tersimpan (bukan 2)');
  report.check('Hanya 1 POST /expenses terkirim (double-click tidak menghasilkan 2 request)', postCount === 1, `postCount=${postCount}`);
  const expensesResp = await page.request.get(`/web/index.php/api/v2/claim/requests/${claimId}/expenses?limit=50`);
  const expensesBody = await expensesResp.json().catch(() => null);
  report.check('Hanya 1 baris expense tersimpan di server (bukan duplikat)', expensesBody?.meta?.total === 1, `total=${expensesBody?.meta?.total}`);

  report.print();
});
