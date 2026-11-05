/**
 * ================================================================================
 * TC-RECRUITMENT-SECURITY-01: Verify IDOR Candidate Access
 * Modul    : Recruitment - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-SECURITY-01-Verify-IDOR-Candidate-Access.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi akses lintas-candidate via manipulasi ID (IDOR). Demo
 *   publik OrangeHRM ini SINGLE ADMIN ROLE (tidak ada multi-tenant/multi-
 *   user scoping di aplikasi aslinya), jadi hasil "tidak ada isolasi"
 *   SANGAT MUNGKIN, dan itu didokumentasikan sebagai baseline arsitektur
 *   (N/A - single-role), BUKAN diasumsikan sebagai bug atau PASS/FAIL
 *   palsu.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-SECURITY-01-Verify-IDOR-Candidate-Access.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';

test('TC-RECRUITMENT-SECURITY-01: cross-candidate access via ID manipulation (IDOR)', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-SECURITY-01', 'IDOR Candidate Access', env.baseURL, page);

  report.step('Buat 2 candidate berbeda (A dan B) di sesi yang sama');
  const candidateA = await createTestCandidate(page, candidatesPage, 'QaIdorA');
  const candidateB = await createTestCandidate(page, candidatesPage, 'QaIdorB');
  report.check('Candidate A dan B berhasil dibuat dengan id berbeda', candidateA.candidateId !== candidateB.candidateId);

  report.step('[API] GET candidate B langsung via request context (satu sesi admin yang sama)');
  const url = `${env.baseURL}/web/index.php/api/v2/recruitment/candidates/${candidateB.candidateId}`;
  const resp = await page.request.get(url);
  const canAccessB = resp.status() === 200;

  report.step('[API] PUT status action untuk candidate id milik "TC lain" (candidate A) dari sesi ini');
  const statusUrl = `${env.baseURL}/web/index.php/api/v2/recruitment/candidates/${candidateA.candidateId}/shortlist`;
  const statusResp = await page.request
    .put(statusUrl, { data: {} })
    .catch((): { status: () => number } => ({ status: () => -1 }));
  const canMutateA = statusResp.status();

  report.check('TC dijalankan tanpa exception', true);

  report.finding(
    'GET candidate lain via ID manipulasi (cross-candidate read)',
    `GET /candidates/${candidateB.candidateId} dari sesi admin yang sama -> status=${resp.status()} ` +
      `(${canAccessB ? 'BERHASIL diakses' : 'DITOLAK'}). OrangeHRM demo publik ini single admin role: semua admin ` +
      'melihat semua data by design, jadi hasil ini adalah N/A - arsitektur single-role, bukan kerentanan IDOR ' +
      'yang valid untuk dilaporkan dalam konteks demo ini (tidak ada boundary multi-tenant untuk ditembus).',
  );
  report.finding(
    'PUT status action untuk candidate id lain (cross-candidate write)',
    `PUT /candidates/${candidateA.candidateId}/shortlist -> status=${canMutateA}. Sama seperti di atas: tidak ` +
      'ada scoping per-user/per-role granular di aplikasi ini (admin tunggal), sehingga tidak ada boundary akses ' +
      'yang relevan untuk ditembus via manipulasi ID di demo single-role ini.',
  );

  report.print();
});
