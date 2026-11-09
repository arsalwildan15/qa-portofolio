/**
 * ================================================================================
 * TC-ADMIN-ORGGI-01: Verify Save Valid Data
 * Modul    : Admin - Organization - General Information
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-ORGGI-01-Verify-Save-Valid-Data.spec.ts
 * Path     : tests/admin/general-information/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi toggle "Edit" lalu mengubah data valid (Notes) pada
 *   General Information berhasil tersimpan via PUT /api/v2/admin/
 *   organization dan nilai baru muncul setelah reload.
 *
 *   [SAFETY] Record ini adalah SATU-SATUNYA record organisasi yang dilihat
 *   SEMUA user demo publik (bukan record baru seperti Add di sub-screen
 *   lain). TC ini mengembalikan nilai Notes ke kondisi semula di akhir
 *   test (lihat AdminGeneralInformationPage.snapshot()/restore()).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/general-information/TC-ADMIN-ORGGI-01-Verify-Save-Valid-Data.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-ORGGI-01: saving valid General Information data succeeds and persists', async ({
  page,
  adminGeneralInformationPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-ORGGI-01', 'Save Valid Data', env.baseURL, page);
  const gi = adminGeneralInformationPage;
  const newNotes = uniqueName('QaNotes');

  report.step('Buka General Information, snapshot nilai asli, toggle Edit, ubah Notes, Save');
  await gi.goto();
  const original = await gi.snapshot();
  await gi.enableEdit();
  await gi.notesField.fill(newNotes);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/organization') && r.request().method() === 'PUT'),
    gi.save(),
  ]);

  report.step('Verify response PUT organization, dan Notes baru muncul setelah reload');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await gi.goto();
  const notesAfterReload = await gi.notesField.inputValue().catch(() => '');
  report.check(`Notes "${newNotes}" tersimpan setelah reload`, notesAfterReload === newNotes, `actual="${notesAfterReload}"`);

  report.step('Restore Notes ke nilai asli (shared-demo hygiene)');
  await gi.restore(original);
  const notesAfterRestore = await gi.notesField.inputValue().catch(() => '');
  report.check('Notes berhasil dikembalikan ke nilai asli', notesAfterRestore === original.notes, `actual="${notesAfterRestore}"`);

  report.print();
});
