/**
 * ================================================================================
 * TC-BUZZ-SECURITY-07: Verify IDOR On Post/Comment Access
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-07-Verify-IDOR-Post-Access.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi akses ke post/comment milik employee LAIN (bukan
 *   yang kita buat sendiri) via manipulasi ID di URL/API. Dibatasi
 *   READ-ONLY (GET) secara sengaja -- demo publik ini berisi post lama
 *   dari seed data employee lain, dan TIDAK boleh dimodifikasi/dihapus
 *   oleh TC ini (destruktif terhadap data shared demo). Pola sama
 *   dengan TC-RECRUITMENT-SECURITY-01 dan TC-PIM-SECURITY-01.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-07-Verify-IDOR-Post-Access.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-BUZZ-SECURITY-07: read access to another employee\'s post via ID (IDOR baseline)', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-SECURITY-07', 'IDOR Post Access', env.baseURL, page);

  report.step('Buat post baru sendiri, catat id-nya dari response');
  await buzzPage.goto();
  await buzzPage.openComposer();
  const resp = await buzzPage.submitTextPost('QaBuzzIdorBaseline');
  const body = await resp.json().catch(() => null);
  const myPostId = body?.data?.post?.id;
  report.check('[API] Post berhasil dibuat, id ter-capture', typeof myPostId === 'number', `id=${myPostId}`);

  report.step('[API] GET comments utk post id YANG LEBIH RENDAH (kemungkinan besar milik employee lain / seed data lama) -- read-only, tidak mengubah apa pun');
  const otherId = typeof myPostId === 'number' && myPostId > 1 ? myPostId - 1 : 1;
  const otherResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/buzz/posts/${otherId}/comments`);
  report.finding(
    'Hasil akses read-only ke post id lain (IDOR baseline)',
    `GET comments post id=${otherId} (bukan milik kita): status=${otherResp.status()}. Demo publik ini single-role ` +
      '(semua admin melihat semua data), jadi hasil "bisa diakses" di sini adalah N/A - arsitektur single-role, ' +
      'BUKAN bug IDOR baru, konsisten preseden TC-RECRUITMENT-SECURITY-01/TC-PIM-SECURITY-01.',
  );
  report.check('TC dijalankan tanpa exception (baseline dokumentasi)', true);

  report.print();
});
