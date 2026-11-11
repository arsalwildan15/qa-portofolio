/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-21: Verify Double-Click Save Does Not Duplicate
 * Modul    : Recruitment - Candidates
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-21-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik ganda cepat pada tombol Save di form Add
 *   Candidate TIDAK membuat 2 candidate identik tersimpan. Titik create
 *   Recruitment BELUM PERNAH diuji utk skenario ini sebelumnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-21-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-CANDIDATE-21: rapid double-click on Save does not create duplicate candidates', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-21', 'Double-Click Save Does Not Duplicate', env.baseURL, page);
  const firstName = uniqueName('QaDoubleCand');
  const lastName = 'Doe';
  const email = `${firstName.toLowerCase()}@example.com`;

  report.step('Isi form candidate valid, klik Save 2x secepat mungkin');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.emailInput.fill(email);

  // NOTE: verifikasi via UI list/pagination (gotoLastPage + rowByText) TERBUKTI TIDAK RELIABLE
  // utk kasus ini -- hasil count berubah-ubah (0/1/2) antar run krn timing pagination, BUKAN
  // krn bug-nya sendiri yang flaky. Ground truth yang akurat & deterministik: baca langsung
  // body response tiap POST (confirmed live via inspeksi manual: 2 response sukses dgn id
  // candidate BERBEDA = 2 data benar2 tersimpan, bukan 1 request gagal + 1 sukses).
  const createdIds: number[] = [];
  page.on('response', async (r) => {
    if (r.request().method() === 'POST' && r.url().includes('/api/v2/recruitment/candidates') && r.status() === 200) {
      const body = await r.json().catch(() => null);
      if (body?.data?.id) createdIds.push(body.data.id);
    }
  });
  await Promise.all([
    candidatesPage.saveButton.click(),
    candidatesPage.saveButton.click({ timeout: 2_000 }).catch(() => {}),
  ]);
  await page.waitForTimeout(3000);

  report.step('Verify jumlah response sukses (200) dan apakah menghasilkan candidate id berbeda (duplikat nyata)');
  report.check(
    'Client TIDAK men-debounce tombol Save (hanya 1 response sukses, bukan bug kritis)',
    createdIds.length === 1,
    `createdIds=${JSON.stringify(createdIds)}`,
  );
  report.check(
    `Candidate "${firstName}" TIDAK ter-duplikat (kedua response sukses TIDAK boleh punya id berbeda)`,
    new Set(createdIds).size <= 1,
    `createdIds=${JSON.stringify(createdIds)}`,
  );

  report.print();
});
