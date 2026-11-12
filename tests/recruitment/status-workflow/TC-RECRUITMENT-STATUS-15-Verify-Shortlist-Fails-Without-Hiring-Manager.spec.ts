/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-15: Verify Shortlist Fails Without Hiring Manager
 * Modul    : Recruitment - Status Workflow
 * Kategori : Security/Regression (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-15-Verify-Shortlist-Fails-Without-Hiring-Manager.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   TC REGRESI KHUSUS utk bug BG-007. Root cause presisi (ditemukan
 *   2026-11-12): endpoint PUT .../candidates/<id>/shortlist mengembalikan
 *   500 Internal Server Error KHUSUS saat candidate.vacancy.hiringManager
 *   === null -- dikonfirmasi via korelasi 8/8 percobaan independen.
 *
 *   src/utils/createTestCandidate.ts sudah diubah untuk SELALU memilih
 *   vacancy DENGAN hiring manager (CandidatesPage.selectVacancyWithHiringManager())
 *   supaya TC lain di suite ini (STATUS-02 s/d STATUS-14) tidak lagi
 *   ter-cascade gagal oleh bug ini -- TAPI ini workaround di SISI TEST,
 *   BUKAN perbaikan di aplikasi. Bug aslinya MASIH ADA. TC ini sengaja
 *   memilih vacancy TANPA hiring manager utk membuktikan bug tsb tetap
 *   reproduce, supaya tidak hilang dari radar regresi hanya karena
 *   helper bersama sekarang menghindarinya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-15-Verify-Shortlist-Fails-Without-Hiring-Manager.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-RECRUITMENT-STATUS-15: shortlisting a candidate on a vacancy with no hiring manager still returns 500 (BG-007 regression)', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-15', 'Shortlist Fails Without Hiring Manager', env.baseURL, page);

  report.step('Buat candidate pada vacancy "Junior Account Assistant" (dikonfirmasi hiringManager=null)');
  await candidatesPage.gotoAddForm();
  const firstName = uniqueName('QaNoHMRegression');
  await candidatesPage.fillName(firstName, 'Doe');
  await candidatesPage.emailInput.fill(`${firstName.toLowerCase()}@example.com`);
  await candidatesPage.vacancySelect.click();
  await page.getByRole('option').filter({ hasText: 'Junior Account Assistant' }).first().click();

  const [createResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST'),
    candidatesPage.save(),
  ]);
  const body = await createResp.json();
  const candidateId = body.data.id;
  const hiringManager = body.data.vacancy?.hiringManager;
  report.check(
    'Vacancy "Junior Account Assistant" dikonfirmasi TIDAK punya hiring manager (prasyarat TC ini)',
    hiringManager === null || hiringManager === undefined,
    `hiringManager=${JSON.stringify(hiringManager)}`,
  );

  report.step('Klik Shortlist, klik Save');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Shortlist').click();
  await page.waitForTimeout(800);

  const [shortlistResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/shortlist') && r.request().method() !== 'GET', { timeout: 15_000 }),
    candidatesPage.save(),
  ]);

  // NOTE: assertion sengaja diarahkan ke perilaku yang BENAR (status 200 = shortlist sukses),
  // KONSISTEN dgn konvensi seluruh project ini -- TC FAIL selama bug ada, PASS hanya kalau
  // aplikasi benar2 diperbaiki. Dibalik dari draft awal (yang sempat assert status===500 PASS
  // saat bug ada) krn itu akan bikin bugListReporter auto-close BG-007 setiap kali TC ini
  // "PASS" mengonfirmasi bug -- logika terbalik, ditemukan & dikoreksi sebelum commit.
  report.step('Verify shortlist BERHASIL (200) meski vacancy tidak punya hiring manager');
  report.check(
    '[API] Endpoint shortlist berhasil (200) utk vacancy TANPA hiring manager (BG-007)',
    shortlistResp.status() === 200,
    `status=${shortlistResp.status()}`,
  );
  if (shortlistResp.status() !== 200) {
    report.finding(
      'Status bug BG-007',
      `MASIH REPRODUCE (status=${shortlistResp.status()}) -- bug aplikasi belum diperbaiki. ` +
        'TC ini sengaja dibuat terpisah dari helper createTestCandidate.ts (yang sekarang ' +
        'menghindari vacancy tanpa hiring manager) supaya bug ini tetap termonitor regresinya.',
    );
  }

  report.print();
});
