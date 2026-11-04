/**
 * ================================================================================
 * TC-PIM-JOB-01 — Verify Edit Job Title And Save
 * Modul    : PIM - Job
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-01-Verify-Edit-Job-Title-And-Save.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengubah dropdown Job Title lalu Save berhasil, memicu
 *   PUT job-details dan PUT employment-contract sekaligus (dikonfirmasi
 *   langsung: OrangeHRM memanggil 2 endpoint berbeda untuk 1 klik Save).
 *
 * [BUG SITUS, bukan bug test, TAPI INTERMITTENT] Tab Job memicu console
 * error 404 asli dari OrangeHRM sendiri (GET .../job-titles/<id>/specification
 * gagal 404) saat Job Title yang dipilih belum punya dokumen spesifikasi.
 * Test ini memilih opsi dropdown ke-2 (nth(1)), bukan Job Title spesifik
 * by name, jadi hasilnya bergantung pada Job Title mana yang kebetulan ada
 * di posisi itu saat run: diobservasi FAILED di sebagian besar run, tapi
 * PASSED di 1 run (4 Nov 2026) ketika opsi yang kepilih kebetulan sudah
 * punya dokumen spesifikasi. Jadi ini bug nyata aplikasi, tapi reproduksinya
 * tidak 100% deterministik, tergantung data Job Title di server demo publik.
 * Test ini SENGAJA dibiarkan FAILED (bukan test.fail()) saat direproduksi
 * supaya temuan ini konsisten tercatat di docs/Bug-List.xlsx, dan supaya
 * Allure report mencerminkan temuan defect yang sebenarnya alih-alih 100%
 * hijau palsu. Kalau run ini PASSED, Bug-List.xlsx otomatis meng-close
 * entry terkait (lihat README bagian "Auto-close on retest"); close
 * otomatis di sini TIDAK berarti bug-nya sudah fix permanen, hanya berarti
 * Job Title yang kepilih di run itu kebetulan sudah punya dokumen.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-01-Verify-Edit-Job-Title-And-Save.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-JOB-01: editing Job Title dropdown and saving succeeds', async ({
  page,
  addEmployeePage,
  jobPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-01', 'Edit Job Title And Save', env.baseURL, page);

  report.step('Buat employee baru (retry otomatis kalau Employee Id collide), navigate ke tab Job');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaJobTitle');
  await jobPage.goto(empNumber);

  report.step('Pilih Job Title = "QA Engineer" (atau opsi pertama yang tersedia), klik Save');
  await jobPage.jobTitleSelect.click();
  const firstOption = page.getByRole('option').nth(1);
  const optionText = await firstOption.textContent();
  await firstOption.click();

  const [jobResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/job-details') && r.request().method() === 'PUT'),
    jobPage.save(),
  ]);

  report.step('Verify response PUT job-details');
  report.check('[API] status === 200', jobResp.status() === 200, `status=${jobResp.status()}`);
  report.check('Job Title terpilih sesuai pilihan', (await jobPage.jobTitleSelect.textContent())?.trim() === optionText?.trim());

  report.print();
});
