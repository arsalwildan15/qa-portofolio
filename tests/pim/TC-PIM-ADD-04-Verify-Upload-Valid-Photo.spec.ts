/**
 * ================================================================================
 * TC-PIM-ADD-04 — Verify Upload Valid Photo
 * Modul    : PIM - Add Employee
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-04-Verify-Upload-Valid-Photo.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi upload foto profil valid (PNG kecil, jauh di bawah batas
 *   1MB) diterima tanpa error validasi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-04-Verify-Upload-Valid-Photo.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

// 1x1 transparent PNG, well under the 1MB limit.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('TC-PIM-ADD-04: uploading a small valid PNG photo is accepted', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-04', 'Upload Valid Photo', env.baseURL, page);
  const employee = uniqueEmployeeName('QaAddPhoto');

  report.step('Navigate ke Add Employee, fill nama, upload foto PNG valid (<1MB)');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.fileInput.setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });

  report.step('Verify tidak ada pesan error ukuran/format, lalu Save berhasil');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
