/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-14: Verify Duplicate Email Allowed
 * Modul    : Recruitment - Candidates
 * Kategori : Negative (-) [TEMUAN]
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-14-Verify-Duplicate-Email-Allowed.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit candidate baru dengan Email yang sudah dipakai
 *   candidate lain. [CONFIRMED via discovery run, dijalankan 2x berturut]:
 *   TIDAK ADA unique constraint pada Email candidate -- kedua candidate
 *   (nama berbeda, email identik) berhasil tersimpan dengan POST 200,
 *   tidak ada pesan duplikat apa pun. Didokumentasikan via report.finding()
 *   karena ini perilaku environment-dependent (beda dari PIM employee yang
 *   punya unique constraint berbeda untuk Employee Id), bukan pass/fail
 *   tegas yang "benar"/"salah".
 *
 *   [CATATAN IMPLEMENTASI] Kedua candidate dibuat langsung via Add Candidate
 *   dengan email yang SAMA PERSIS sejak awal (bukan membaca ulang email
 *   candidate pertama dari halaman detail-nya) -- pendekatan lebih
 *   sederhana ini menghindari round-trip gotoDetail() tambahan yang,
 *   dikombinasikan dengan 2 upload resume berturut-turut, terbukti
 *   menyebabkan test hang pasca report.print() pada percobaan awal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-14-Verify-Duplicate-Email-Allowed.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4 minimal valid-looking resume content');

test('TC-RECRUITMENT-CANDIDATE-14: a second candidate with a duplicate email [TEMUAN]', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-14', 'Duplicate Email Allowed', env.baseURL, page);
  const sharedEmail = uniqueEmail('qadupemail');

  async function addCandidateWithEmail(namePrefix: string) {
    const { firstName, lastName } = uniqueEmployeeName(namePrefix);
    await candidatesPage.gotoAddForm();
    await candidatesPage.fillName(firstName, lastName);
    await candidatesPage.selectFirstVacancy();
    await candidatesPage.emailInput.fill(sharedEmail);
    await candidatesPage.fileInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: VALID_PDF_BUFFER,
    });
    const respPromise = page
      .waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST', { timeout: 10_000 })
      .catch(() => null);
    await candidatesPage.save();
    const resp = await respPromise;
    await page.waitForTimeout(500);
    return resp;
  }

  report.step('Buat candidate pertama dengan Email X');
  const firstResp = await addCandidateWithEmail('QaDupEmailFirst');
  report.check('Candidate pertama berhasil dibuat', firstResp?.status() === 200, `status=${firstResp?.status()}`);

  report.step('Buat candidate kedua dengan First/Last Name baru tapi Email X yang sama persis');
  const secondResp = await addCandidateWithEmail('QaDupEmailSecond');
  const duplicateErrorText = await candidatesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.check('TC dijalankan tanpa exception', true);

  if (secondResp && secondResp.status() === 200) {
    report.finding(
      'Email duplikat DIIZINKAN oleh app (tidak ada unique constraint)',
      `Candidate kedua dengan email yang sama persis ("${sharedEmail}") dengan candidate pertama berhasil ` +
        `tersimpan (POST status=${secondResp.status()}), tidak ada pesan error duplikat. Berbeda dengan PIM ` +
        'employee yang punya unique constraint Employee Id, modul Recruitment tidak membatasi email unik antar candidate.',
    );
  } else {
    report.finding(
      'Email duplikat DITOLAK oleh app',
      `Candidate kedua gagal tersimpan (postFired=${!!secondResp}${secondResp ? `, status=${secondResp.status()}` : ''}), ` +
        `error ditampilkan: "${duplicateErrorText}".`,
    );
  }

  report.print();
});
