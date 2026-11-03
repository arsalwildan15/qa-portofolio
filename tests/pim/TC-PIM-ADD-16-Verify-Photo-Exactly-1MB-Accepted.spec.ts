/**
 * ================================================================================
 * TC-PIM-ADD-16 — Verify Photo Exactly 1MB Accepted
 * Modul    : PIM - Add Employee
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-16-Verify-Photo-Exactly-1MB-Accepted.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi upload foto tepat di batas 1MB (sesuai teks UI "up to
 *   1MB") diterima tanpa error validasi ukuran.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-16-Verify-Photo-Exactly-1MB-Accepted.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

const ONE_MB = 1024 * 1024;

test('TC-PIM-ADD-16: photo at exactly 1MB is accepted', async ({ page, addEmployeePage }) => {
  const report = new TestReport('TC-PIM-ADD-16', 'Photo Exactly 1MB Accepted', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPhoto1MB');

  report.step('Navigate ke Add Employee, fill nama, upload file PNG tepat 1MB (1024*1024 byte)');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.fileInput.setInputFiles({
    name: 'exact1mb.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(ONE_MB, 1),
  });

  report.step('Klik Save, verify tidak ada error validasi ukuran dan POST terkirim');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
