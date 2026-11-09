/**
 * ================================================================================
 * TC-ADMIN-SKILL-07: Verify Delete Skill
 * Modul    : Admin - Qualifications - Skills
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SKILL-07-Verify-Delete-Skill.spec.ts
 * Path     : tests/admin/skills/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Skill yang baru dibuat bisa dihapus lewat tombol aksi
 *   pertama di row (trash/delete).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/skills/TC-ADMIN-SKILL-07-Verify-Delete-Skill.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-SKILL-07: a newly created Skill can be deleted', async ({
  page,
  adminSkillsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-SKILL-07', 'Delete Skill', env.baseURL, page);
  const name = uniqueName('QaDeleteSkill');

  report.step('Buat Skill baru untuk dihapus');
  await adminSkillsPage.gotoAdd();
  await adminSkillsPage.nameInput.fill(name);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/skills') && r.request().method() === 'POST'),
    adminSkillsPage.save(),
  ]);
  await adminSkillsPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus Skill yang baru dibuat');
  const row = adminSkillsPage.rowByName(name).first();
  report.check('Skill muncul sebelum dihapus', await row.isVisible({ timeout: 5_000 }).catch(() => false));
  await adminSkillsPage.deleteRow(row);
  await page.waitForTimeout(1200);

  report.step('Verify: skill tidak lagi muncul di list');
  report.check(
    `Skill "${name}" sudah terhapus`,
    !(await adminSkillsPage.rowByName(name).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
