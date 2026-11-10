/**
 * ================================================================================
 * TC-ADMIN-LANGPACK-02: Verify Delete / Re-Add Restore Cycle
 * Modul    : Admin - Configuration - Language Packages
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LANGPACK-02-Verify-Delete-ReAdd-Restore.spec.ts
 * Path     : tests/admin/language-packages/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Delete pada package "Tamil (India)" berhasil menghapus
 *   baris-nya, lalu Add berhasil mengembalikannya (restore-after-mutate),
 *   DIVERIFIKASI VIA API (GET /api/v2/admin/i18n/languages?activeOnly=
 *   true), bukan cuma scan baris UI.
 *
 *   [TEMUAN PENTING] TIDAK bisa menambah locale BARU di demo ini -- dialog
 *   Add menampilkan "No Records Found" di dropdown Name karena SEMUA 9
 *   locale yang OrangeHRM sediakan SUDAH ter-enable. TC ini karena itu
 *   menguji Delete-lalu-re-Add pada package YANG SUDAH ADA.
 *
 *   [TEMUAN PROSES, PENTING] Dropdown Name di dialog Add punya ~450 opsi
 *   dan TERBUKTI tidak reliable didorong lewat klik mouse biasa di
 *   automation headless (dikonfirmasi live lewat beberapa percobaan saat
 *   menulis TC ini -- lihat AdminLanguagePackagesPage
 *   .addLanguagePackageRobust() untuk detail/mitigasi: keyboard-driven
 *   selection + retry + verifikasi API, bukan cuma baca ulang UI).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/language-packages/TC-ADMIN-LANGPACK-02-Verify-Delete-ReAdd-Restore.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const TARGET_PACKAGE = 'Tamil (India)';

test('TC-ADMIN-LANGPACK-02: deleting then re-adding Tamil (India) round-trips cleanly (API-verified)', async ({
  page,
  adminLanguagePackagesPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-ADMIN-LANGPACK-02', 'Verify Delete ReAdd Restore', env.baseURL, page);
  const lp = adminLanguagePackagesPage;

  report.step(`Verify baseline: "${TARGET_PACKAGE}" aktif via API sebelum TC ini`);
  await lp.goto();
  const existedBefore = await lp.isLanguagePackageActive(TARGET_PACKAGE);
  report.check(`Package "${TARGET_PACKAGE}" aktif sebelum TC ini (baseline, via API)`, existedBefore);
  if (!existedBefore) {
    report.finding('Baseline tidak sesuai', `"${TARGET_PACKAGE}" tidak ditemukan via API -- TC ini di-skip, tidak memodifikasi apa pun`);
    report.print();
    return;
  }

  report.step(`Hapus package "${TARGET_PACKAGE}" lewat UI, verify via API`);
  const targetRow = lp.rowByName(TARGET_PACKAGE);
  await lp.deleteRow(targetRow);
  await page.waitForTimeout(1500);
  const deletedOk = !(await lp.isLanguagePackageActive(TARGET_PACKAGE));
  report.check(`Package "${TARGET_PACKAGE}" berhasil dihapus (via API)`, deletedOk);

  report.step(`[SAFETY -- WAJIB] Restore: Add "${TARGET_PACKAGE}" kembali lewat keyboard-driven selection + retry, verify via API`);
  const restoredOk = await lp.addLanguagePackageRobust(TARGET_PACKAGE, 3);
  report.check(`Package "${TARGET_PACKAGE}" berhasil di-restore (via API, sampai 3x percobaan)`, restoredOk);

  report.print();
});
