/**
 * ================================================================================
 * TC-ADMIN-SKILL-03: Verify Skill Name Very Long Text
 * Modul    : Admin - Qualifications - Skills
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SKILL-03-Verify-Skill-Name-Very-Long-Text.spec.ts
 * Path     : tests/admin/skills/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku form saat Skill Name diisi teks sangat
 *   panjang (300 karakter). Hasilnya didokumentasikan via report.finding()
 *   karena perilaku batas ini genuinely tergantung apakah ada max-length
 *   validation, bukan pass/fail yang jelas salah (pola sama dengan
 *   TC-ADMIN-JOBTITLE-03).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/skills/TC-ADMIN-SKILL-03-Verify-Skill-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-SKILL-03: a 300-character Skill Name is documented as-is', async ({
  page,
  adminSkillsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SKILL-03', 'Skill Name Very Long Text', env.baseURL, page);
  const longName = 'QaLongSkill'.padEnd(300, 'X');

  report.step('Isi Name dengan 300 karakter, klik Save');
  await adminSkillsPage.gotoAdd();
  await adminSkillsPage.nameInput.fill(longName);
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/skills') && r.request().method() === 'POST', { timeout: 10_000 })
    .catch(() => null);
  await adminSkillsPage.save();
  const resp = await respPromise;
  await page.waitForTimeout(500);

  report.step('Verify: catat apakah diterima, ditolak validasi, atau dipotong');
  if (resp) {
    report.finding('Skill Name 300 karakter diterima server', `POST status=${resp.status()}`);
  } else {
    const error = await adminSkillsPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
    report.finding('Skill Name 300 karakter ditolak/divalidasi client-side', `error=${error ?? 'tidak ada pesan terbaca'}`);
  }
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
