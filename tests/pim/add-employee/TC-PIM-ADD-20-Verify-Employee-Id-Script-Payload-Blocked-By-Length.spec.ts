/**
 * ================================================================================
 * TC-PIM-ADD-20 — Verify Employee Id Script Payload Blocked By Length [TEMUAN]
 * Modul    : PIM - Add Employee
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-20-Verify-Employee-Id-Script-Payload-Blocked-By-Length.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan temuan: payload mirip XSS di Employee Id
 *   ("<script>x</script>", 21 karakter) diblokir oleh validasi PANJANG 10
 *   karakter ("Should not exceed 10 characters"), BUKAN oleh filter XSS
 *   khusus — payload "kebetulan tertangkap" validasi lain. TC ini adalah
 *   dokumentasi observasi (finding), bukan klaim bahwa field ini anti-XSS.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-20-Verify-Employee-Id-Script-Payload-Blocked-By-Length.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-ADD-20: script-tag payload in Employee Id is blocked by the 10-char limit', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport(
    'TC-PIM-ADD-20',
    'Employee Id Script Payload Blocked By Length',
    env.baseURL,
    page,
  );
  const employee = uniqueEmployeeName('QaIdScript');
  const payload = '<script>x</script>'; // 21 characters, over the 10-char Employee Id limit

  report.step(`Navigate ke Add Employee, set Employee Id = "${payload}" (${payload.length} char)`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.employeeIdInput.fill(payload);
  await addEmployeePage.save();

  report.step('Verify pesan yang muncul adalah validasi PANJANG, bukan filter XSS khusus');
  await isVisibleWithWait(addEmployeePage.fieldErrors.first());
  const errors = await addEmployeePage.fieldErrors.allTextContents();
  report.finding(
    'Mekanisme blokir payload ini',
    `Payload ${payload.length} karakter diblokir oleh validasi "Should not exceed 10 characters" ` +
      `(validasi panjang generik), bukan sanitasi/filter khusus terhadap tag <script>. ` +
      `errors=${JSON.stringify(errors)}`,
  );
  report.check(
    'Pesan "Should not exceed 10 characters" muncul',
    errors.includes('Should not exceed 10 characters'),
    `errors=${JSON.stringify(errors)}`,
  );

  report.print();
});
