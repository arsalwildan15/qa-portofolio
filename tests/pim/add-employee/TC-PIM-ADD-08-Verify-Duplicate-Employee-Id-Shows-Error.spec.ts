/**
 * ================================================================================
 * TC-PIM-ADD-08 — Verify Duplicate Employee Id Shows Error [TEMUAN]
 * Modul    : PIM - Add Employee
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-08-Verify-Duplicate-Employee-Id-Shows-Error.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengisi Employee Id yang sudah dipakai employee lain
 *   menampilkan "Employee Id already exists" dan POST TIDAK pernah
 *   terkirim ke server (dikonfirmasi langsung via live discovery session
 *   — auto-generated ID sempat collide dan perilaku ini terekam nyata,
 *   bukan asumsi).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-08-Verify-Duplicate-Employee-Id-Shows-Error.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-ADD-08: duplicate Employee Id is rejected client-side', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-08', 'Duplicate Employee Id Shows Error', env.baseURL, page);

  report.step('Buat employee pertama dengan Employee Id eksplisit (hindari collision dgn auto-generate)');
  await addEmployeePage.goto();
  const first = uniqueEmployeeName('QaDupIdA');
  await addEmployeePage.fillName(first.firstName, first.lastName);
  // Explicit ID instead of relying on the auto-generated value, which can collide
  // with another employee created moments earlier on this shared public demo.
  const existingId = `D${Date.now().toString().slice(-9)}`; // 10 chars, within the confirmed limit
  await addEmployeePage.employeeIdInput.fill(existingId);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });

  report.step(`Buat employee kedua, paksa Employee Id = "${existingId}" (duplikat dari employee pertama)`);
  await addEmployeePage.goto();
  const second = uniqueEmployeeName('QaDupIdB');
  await addEmployeePage.fillName(second.firstName, second.lastName);
  await addEmployeePage.employeeIdInput.fill(existingId);

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/pim/employees') && req.method() === 'POST') submitted = true;
  });

  report.step('Klik Save, verify "Employee Id already exists" muncul dan POST tidak terkirim');
  await addEmployeePage.save();
  report.check(
    'Pesan "Employee Id already exists" visible',
    await isVisibleWithWait(page.getByText('Employee Id already exists')),
  );
  report.check('POST TIDAK terkirim', submitted === false);

  report.print();
});
