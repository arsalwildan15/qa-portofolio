/**
 * ================================================================================
 * TC-ADMIN-SKILL-06: Verify Cancel Discards Form
 * Modul    : Admin - Qualifications - Skills
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SKILL-06-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/admin/skills/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel pada form Add Skill membatalkan isian dan
 *   kembali ke list tanpa menyimpan apa pun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/skills/TC-ADMIN-SKILL-06-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SKILL-06: clicking Cancel discards the Add Skill form', async ({
  page,
  adminSkillsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SKILL-06', 'Cancel Discards Form', env.baseURL, page);
  const name = uniqueName('QaCancelledSkill');

  report.step('Isi Name, klik Cancel');
  await adminSkillsPage.gotoAdd();
  await adminSkillsPage.nameInput.fill(name);
  await adminSkillsPage.cancelButton.click();
  await page.waitForTimeout(1200);

  report.step('Verify: kembali ke list, skill TIDAK tersimpan');
  report.check('Kembali ke list Skills', page.url().includes('Skills'));
  report.check(
    `Skill "${name}" TIDAK muncul di list`,
    !(await adminSkillsPage.rowByName(name).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
