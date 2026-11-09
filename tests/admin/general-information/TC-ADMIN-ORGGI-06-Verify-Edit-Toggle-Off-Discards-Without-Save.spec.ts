/**
 * ================================================================================
 * TC-ADMIN-ORGGI-06: Verify Edit Toggle Off Discards Without Save
 * Modul    : Admin - Organization - General Information
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-ORGGI-06-Verify-Edit-Toggle-Off-Discards-Without-Save.spec.ts
 * Path     : tests/admin/general-information/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku "Cancel" di screen ini -- yang TIDAK
 *   punya tombol Cancel sama sekali (dikonfirmasi live, beda dari semua
 *   sub-screen Admin lain). Satu-satunya cara "membatalkan" edit adalah
 *   toggle switch "Edit" kembali ke off.
 *
 *   [TEMUAN TEKNIS dikonfirmasi live] Toggle "Edit" off TIDAK langsung
 *   mengembalikan tampilan field ke nilai asli -- field yang sudah
 *   disabled kembali TETAP menampilkan teks yang baru diketik sampai
 *   halaman di-reload. Data TIDAK pernah terkirim ke server (tidak ada
 *   PUT), jadi reload membuktikan nilai asli tetap aman di backend --
 *   ini murni quirk UI/UX (nilai tampilan basi pada field yang sudah
 *   disabled), BUKAN kehilangan data. Dicatat via finding(), bukan
 *   dianggap bug fungsional, karena tidak ada mutasi data yang
 *   sebenarnya terjadi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/general-information/TC-ADMIN-ORGGI-06-Verify-Edit-Toggle-Off-Discards-Without-Save.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-ORGGI-06: toggling Edit off without Save never persists the change server-side', async ({
  page,
  adminGeneralInformationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-ORGGI-06', 'Edit Toggle Off Discards Without Save', env.baseURL, page);
  const gi = adminGeneralInformationPage;

  report.step('Buka General Information, catat tidak ada tombol Cancel di form ini');
  await gi.goto();
  const original = await gi.snapshot();
  const cancelButtonCount = await page.getByRole('button', { name: 'Cancel' }).count();
  report.check('Tidak ada tombol "Cancel" di screen ini (beda dari sub-screen Admin lain)', cancelButtonCount === 0, `count=${cancelButtonCount}`);

  report.step('Toggle Edit, ubah Organization Name tanpa Save, toggle Edit off lagi');
  await gi.enableEdit();
  await gi.organizationNameInput.fill('TEMP SHOULD NOT PERSIST');
  await gi.editToggle.click();
  await page.waitForTimeout(800);
  const nameRightAfterToggleOff = await gi.organizationNameInput.inputValue().catch(() => '');

  report.step('Verify via full reload: nilai TIDAK pernah tersimpan di server');
  await gi.goto();
  const nameAfterReload = await gi.organizationNameInput.inputValue().catch(() => '');
  report.check(
    'Organization Name TIDAK berubah di server (tetap nilai asli setelah reload)',
    nameAfterReload === original.organizationName,
    `afterReload="${nameAfterReload}", original="${original.organizationName}"`,
  );
  report.finding(
    'Toggle Edit off tanpa Save -- tampilan field sebelum reload',
    `Field Organization Name tetap menampilkan "${nameRightAfterToggleOff}" (bukan nilai asli "${original.organizationName}") ` +
      'segera setelah toggle Edit off, meskipun field sudah disabled lagi dan tidak ada PUT yang terkirim. Reload membuktikan ' +
      'data asli aman di server -- ini quirk tampilan (stale displayed value pada field disabled), bukan kehilangan data nyata.',
  );

  report.print();
});
