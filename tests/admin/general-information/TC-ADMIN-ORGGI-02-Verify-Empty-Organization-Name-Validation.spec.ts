/**
 * ================================================================================
 * TC-ADMIN-ORGGI-02: Verify Empty Organization Name Validation
 * Modul    : Admin - Organization - General Information
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-ORGGI-02-Verify-Empty-Organization-Name-Validation.spec.ts
 * Path     : tests/admin/general-information/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengosongkan Organization Name (satu-satunya field
 *   required di form ini, dikonfirmasi live) dan klik Save menampilkan
 *   validasi "Required" dan TIDAK mengirim PUT ke server. Tidak perlu
 *   restore karena tidak ada apa pun yang tersimpan (save ditolak
 *   client-side).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/general-information/TC-ADMIN-ORGGI-02-Verify-Empty-Organization-Name-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-ORGGI-02: clearing the required Organization Name blocks Save with a Required error', async ({
  page,
  adminGeneralInformationPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-ORGGI-02', 'Empty Organization Name Validation', env.baseURL, page);
  const gi = adminGeneralInformationPage;

  report.step('Buka General Information, toggle Edit, kosongkan Organization Name, klik Save');
  await gi.goto();
  await gi.enableEdit();
  await gi.organizationNameInput.fill('');

  const putPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/organization') && r.request().method() === 'PUT', { timeout: 6_000 })
    .catch(() => null);
  await gi.save();
  const resp = await putPromise;

  report.step('Verify: pesan Required muncul, tidak ada PUT yang sukses terkirim');
  const errorText = await gi.fieldErrors.first().textContent({ timeout: 3_000 }).catch(() => null);
  report.check('Pesan "Required" muncul di Organization Name', (errorText ?? '').trim() === 'Required', `actual="${errorText ?? 'tidak ada'}"`);
  report.check('Tidak ada PUT organization yang terkirim (ditolak client-side)', resp === null, `resp=${resp ? resp.status() : 'tidak ada'}`);

  report.print();
});
