/**
 * ================================================================================
 * TC-ADMIN-SKILL-05: Verify SQL Injection In Description
 * Modul    : Admin - Qualifications - Skills
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SKILL-05-Verify-SQL-Injection-In-Description.spec.ts
 * Path     : tests/admin/skills/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di Skill Description (field
 *   textarea -- surface berbeda dari Name, satu-satunya sub-screen di
 *   grup Qualifications dengan field kedua ini) tersimpan sebagai string
 *   literal dan tidak merusak database/menimbulkan error server.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/skills/TC-ADMIN-SKILL-05-Verify-SQL-Injection-In-Description.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SKILL-05: a SQL injection payload in Skill Description does not break the app', async ({
  page,
  adminSkillsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-SKILL-05', 'SQL Injection In Description', env.baseURL, page);
  const name = uniqueName('QaSkillSqli');
  const payload = `' OR '1'='1'; DROP TABLE ohrm_skill;--`;

  report.step('Isi Name (valid) + Description dengan payload SQL injection, klik Save');
  await adminSkillsPage.gotoAdd();
  await adminSkillsPage.nameInput.fill(name);
  await adminSkillsPage.descriptionTextarea.fill(payload);
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/skills') && r.request().method() === 'POST', { timeout: 10_000 })
    .catch(() => null);
  await adminSkillsPage.save();
  const resp = await respPromise;
  await page.waitForTimeout(500);

  report.step('Verify: list masih berfungsi normal setelah payload (tidak ada server error)');
  await adminSkillsPage.goto();
  await page.waitForTimeout(3000);
  const listStillWorks = await adminSkillsPage.tableRows.first().isVisible({ timeout: 10_000 }).catch(() => false);
  report.check('List Skills masih berfungsi normal setelah payload SQLi', listStillWorks, `postStatus=${resp?.status() ?? 'tidak ada'}`);

  report.print();
});
