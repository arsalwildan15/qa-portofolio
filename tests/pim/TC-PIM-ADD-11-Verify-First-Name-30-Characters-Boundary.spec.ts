/**
 * ================================================================================
 * TC-PIM-ADD-11 — Verify First Name 30 Characters Boundary
 * Modul    : PIM - Add Employee
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-11-Verify-First-Name-30-Characters-Boundary.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi First Name tepat 30 karakter (batas maksimum yang
 *   dikonfirmasi langsung — bukan 255 seperti Login) diterima tanpa
 *   validasi error.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-11-Verify-First-Name-30-Characters-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-ADD-11: First Name at exactly 30 characters is accepted', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-11', 'First Name 30 Characters Boundary', env.baseURL, page);
  const { lastName } = uniqueEmployeeName('x');
  const firstName30 = 'A'.repeat(30);

  report.step('Navigate ke Add Employee, fill First Name = 30x "A"');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(firstName30, lastName);

  report.step('Klik Save, verify tidak ada validasi length error dan POST terkirim');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
