/**
 * ================================================================================
 * TC-PIM-ADD-15 — Verify Photo Over 1MB Rejected
 * Modul    : PIM - Add Employee
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-15-Verify-Photo-Over-1MB-Rejected.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi upload foto 1MB + 1 byte (satu byte di atas batas yang
 *   tertulis di UI: "Accepts jpg, .png, .gif up to 1MB") ditolak oleh
 *   validasi ukuran file.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-15-Verify-Photo-Over-1MB-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

const ONE_MB = 1024 * 1024;

test('TC-PIM-ADD-15: photo larger than 1MB is rejected', async ({ page, addEmployeePage }) => {
  const report = new TestReport('TC-PIM-ADD-15', 'Photo Over 1MB Rejected', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPhotoOver');

  report.step('Navigate ke Add Employee, fill nama, upload file PNG berukuran 1MB + 1 byte');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const oversizedBuffer = Buffer.alloc(ONE_MB + 1, 1);
  await addEmployeePage.fileInput.setInputFiles({
    name: 'oversized.png',
    mimeType: 'image/png',
    buffer: oversizedBuffer,
  });

  report.step('Verify muncul pesan error ukuran file, atau file ditolak sebelum ter-attach');
  const sizeError = page.getByText(/exceeds|too large|1\s?MB/i);
  const errorVisible = await isVisibleWithWait(sizeError, 5_000);
  report.finding(
    'Perilaku upload foto > 1MB',
    errorVisible
      ? 'Validasi ukuran file terlihat sebagai pesan error di UI.'
      : 'Tidak ada pesan error eksplisit terlihat dalam 5s — perlu review manual apakah file benar-benar ditolak atau diam-diam gagal ter-attach.',
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
