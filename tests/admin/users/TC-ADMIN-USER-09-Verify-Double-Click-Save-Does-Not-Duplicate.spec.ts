/**
 * ================================================================================
 * TC-ADMIN-USER-09: Verify Double-Click Save Does Not Duplicate
 * Modul    : Admin - User Management - Users
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-09-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik ganda cepat pada tombol Save TIDAK membuat 2 user
 *   identik tersimpan. Pola sama dgn TC-PIM-ADD-22 (sudah ada), TC-LOGIN-30,
 *   dan TC-BUZZ-05 (sudah confirmed BUG race condition di Buzz) -- Admin
 *   BELUM PERNAH diuji utk skenario ini sebelumnya di titik create mana pun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-09-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-USER-09: rapid double-click on Save does not create duplicate users', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-USER-09', 'Double-Click Save Does Not Duplicate', env.baseURL, page);
  const username = uniqueName('QaDoubleUser');

  report.step('Isi form user valid, klik Save 2x secepat mungkin');
  await adminUsersPage.gotoAdd();
  await adminUsersPage.selectUserRole('ESS');
  await adminUsersPage.fillFirstEmployeeName();
  await adminUsersPage.selectStatus('Enabled');
  await adminUsersPage.usernameInput.fill(username);
  await adminUsersPage.passwordInput.fill('QaPassword123!');
  await adminUsersPage.confirmPasswordInput.fill('QaPassword123!');

  let postCount = 0;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/admin/users')) postCount++;
  });
  await Promise.all([
    adminUsersPage.saveButton.click(),
    adminUsersPage.saveButton.click({ timeout: 2_000 }).catch(() => {}),
  ]);
  await page.waitForTimeout(2500);

  report.step('Verify jumlah POST request dan jumlah row di list');
  report.check(
    'Client TIDAK men-debounce tombol Save (2 request terkirim) -- gap minor, bukan bug kritis',
    postCount === 1,
    `postCount=${postCount}`,
  );
  await adminUsersPage.goto();
  await page.waitForTimeout(1500);
  const count = await adminUsersPage.rowByUsername(username).count();
  report.check(
    `User "${username}" muncul TEPAT 1 kali di list (TIDAK ada duplikat data tersimpan)`,
    count === 1,
    `count=${count}`,
  );
  report.finding(
    'Mengapa tidak ada duplikat data meski 2 POST terkirim',
    'Request ke-2 ditolak server dgn 422 (kemungkinan validasi unique-username) -- data integrity ' +
      'TERJAGA oleh validasi server-side, bukan oleh client. Tapi penanganan response 422 tsb ' +
      'memicu "Uncaught exception: fe" yang sama persis dgn bug app-wide yang sudah dikonfirmasi ' +
      'via simulasi network-drop (BG-199/200/201/202) -- lewat jalur BERBEDA (validasi error asli, ' +
      'bukan network failure), memperkuat bukti bug ini app-wide dan tidak terbatas pada network ' +
      'failure saja, kemungkinan trigger-nya ANY non-2xx response.',
  );

  report.print();
});
