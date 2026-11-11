/**
 * ================================================================================
 * TC-ADMIN-SKILL-01: Verify Add Skill Valid
 * Modul    : Admin - Qualifications - Skills
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SKILL-01-Verify-Add-Skill-Valid.spec.ts
 * Path     : tests/admin/skills/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Skill baru (Name + Description) berhasil
 *   tersimpan via POST /api/v2/admin/skills dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/skills/TC-ADMIN-SKILL-01-Verify-Add-Skill-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SKILL-01: adding a skill with valid Name + Description succeeds', async ({
  page,
  adminSkillsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-SKILL-01', 'Add Skill Valid', env.baseURL, page);
  const name = uniqueName('QaSkill');

  report.step('Isi Name + Description, klik Save');
  await adminSkillsPage.gotoAdd();
  await adminSkillsPage.nameInput.fill(name);
  await adminSkillsPage.descriptionTextarea.fill('Discovered via automated QA suite.');

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/skills') && r.request().method() === 'POST'),
    adminSkillsPage.save(),
  ]);

  report.step('Verify response POST skills, dan skill muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  const body = await resp.json().catch(() => null);
  report.check('[API] response menyertakan description yang diisi', body?.data?.description === 'Discovered via automated QA suite.', `body=${JSON.stringify(body)}`);
  await adminSkillsPage.goto();
  await page.waitForTimeout(3000);
  report.check(
    `Skill "${name}" muncul di list`,
    await adminSkillsPage.rowByName(name).first().isVisible({ timeout: 10_000 }).catch(() => false),
  );

  report.print();
});
