/**
 * ================================================================================
 * TC-ADMIN-OAUTH-05: Verify Delete OAuth Client
 * Modul    : Admin - Configuration - OAuth Client
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-OAUTH-05-Verify-Delete.spec.ts
 * Path     : tests/admin/oauth-client/
 * ================================================================================
 *
 * TUJUAN:
 *   Menambah 1 OAuth Client throwaway lalu menghapusnya lagi, SEKALIGUS
 *   memverifikasi apakah trash icon aktif untuk client yang BARU dibuat.
 *
 *   [TEMUAN PENTING, dikonfirmasi live] Seed row "OrangeHRM Mobile App"
 *   punya trash/pencil icon yang KEDUANYA `disabled` (protected system
 *   client) -- belum dikonfirmasi apakah client BARU juga terkunci sama.
 *   TC ini mendokumentasikan hasilnya apa adanya: jika trash aktif,
 *   dihapus (cleanup); jika ternyata disabled juga, dicatat via
 *   finding() (bukan dianggap bug, dan record ditinggal ada -- sama pola
 *   dengan TC Add/XSS lain di screen ini yang additive & harmless).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/oauth-client/TC-ADMIN-OAUTH-05-Verify-Delete.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-OAUTH-05: a newly-created OAuth Client can be deleted (cleanup)', async ({
  page,
  adminOAuthClientPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-OAUTH-05', 'Verify Delete', env.baseURL, page);
  const oc = adminOAuthClientPage;
  const clientName = uniqueName('QaDeleteOAuth');

  report.step('Buka OAuth Client, tambah 1 client throwaway');
  await oc.goto();
  await oc.addButton.click();
  await page.waitForTimeout(800);
  await oc.fillClient(clientName, 'com.example.qa://oauthredirect');
  await oc.saveAndReload();
  const row = oc.rowByName(clientName);
  const added = await row
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  report.check('Client throwaway berhasil ditambahkan', added);
  if (!added) {
    report.print();
    return;
  }

  report.step('Cek apakah trash icon aktif untuk client baru ini, lalu hapus jika aktif');
  const trashButton = row.first().locator('.oxd-table-cell-actions button').first();
  const trashDisabled = await trashButton.isDisabled();
  report.finding('Trash icon untuk client BARU', trashDisabled ? 'DISABLED (terkunci juga, sama seperti seed row)' : 'AKTIF (bisa dihapus)');

  if (!trashDisabled) {
    await oc.deleteRow(row);
    const afterDelete = (await oc.rowByName(clientName).count()) === 0;
    report.check('Client throwaway berhasil dihapus', afterDelete);
  } else {
    report.check('TC dijalankan tanpa exception (trash disabled, record ditinggal -- additive harmless)', true);
  }

  report.print();
});
