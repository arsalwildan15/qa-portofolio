/**
 * ================================================================================
 * TC-PIM-ADD-23 — Verify Unicode Emoji In First Name
 * Modul    : PIM - Add Employee
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-23-Verify-Unicode-Emoji-In-First-Name.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi First Name berisi unicode/emoji ("José 😀") tidak
 *   membuat server crash dan tersimpan sesuai input.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-23-Verify-Unicode-Emoji-In-First-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-ADD-23: unicode and emoji in First Name do not crash the server', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-23', 'Unicode Emoji In First Name', env.baseURL, page);
  const { lastName } = uniqueEmployeeName('QaEmoji');
  const firstName = 'José 😀';

  report.step(`Navigate ke Add Employee, fill First Name = "${firstName}"`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(firstName, lastName);

  report.step('Klik Save, verify server tidak crash dan nama tersimpan sesuai input');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  report.check('[API] status < 500', resp.status() < 500, `status=${resp.status()}`);
  if (resp.status() === 200) {
    const body = await resp.json().catch(() => null);
    report.check('[API] firstName tersimpan sesuai input', body?.data?.firstName === firstName, JSON.stringify(body?.data));
  }

  report.print();
});
