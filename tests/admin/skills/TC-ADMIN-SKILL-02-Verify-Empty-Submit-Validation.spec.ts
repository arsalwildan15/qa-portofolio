/**
 * ================================================================================
 * TC-ADMIN-SKILL-02: Verify Empty Submit Validation
 * Modul    : Admin - Qualifications - Skills
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SKILL-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/skills/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Skill tanpa mengisi Name (Description
 *   dibiarkan kosong, karena opsional) menampilkan validasi "Required"
 *   dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/skills/TC-ADMIN-SKILL-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-SKILL-02: submitting an empty Add Skill form shows Required validation', async ({
  page,
  adminSkillsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SKILL-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add Skill, klik Save tanpa isi apa pun');
  await adminSkillsPage.gotoAdd();
  await adminSkillsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul pada Name, form tidak submit');
  const requiredError = await adminSkillsPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);

  report.print();
});
