/**
 * ================================================================================
 * TC-PIM-CONTACT-06 — Verify SQL Injection In City
 * Modul    : PIM - Contact Details
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-06-Verify-SQL-Injection-In-City.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di field City tidak membuat server
 *   crash dan tidak membocorkan error database ke client.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-06-Verify-SQL-Injection-In-City.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-CONTACT-06: SQL injection payload in City does not crash the server', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-06', 'SQL Injection In City', env.baseURL, page);
  const employee = uniqueEmployeeName('QaContactSqli');

  report.step('Buat employee baru, navigate ke Contact Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await contactDetailsPage.goto(empNumber);

  report.step(`Fill City = "' OR '1'='1", klik Save`);
  await contactDetailsPage.cityInput.fill("' OR '1'='1");
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/contact-details') && r.request().method() === 'PUT'),
    contactDetailsPage.save(),
  ]);

  report.step('Verify server tidak crash dan tidak bocor error SQL');
  report.check('[API] status < 500', resp.status() < 500, `status=${resp.status()}`);
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  // Bare "sql" substring proved too broad on this page (dynamic sidebar/menu
  // content occasionally matches by coincidence, unrelated to any leak) —
  // check for actual DB-error signatures instead, same intent as TC-LOGIN-21
  // but tightened for PIM's much larger page body.
  report.check(
    'Body tidak mengandung signature error database',
    !/sql syntax|mysql|sqlstate|database error|syntax error/.test(bodyText),
  );

  report.print();
});
