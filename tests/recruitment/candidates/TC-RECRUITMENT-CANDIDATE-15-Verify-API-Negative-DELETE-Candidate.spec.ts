/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-15: Verify API Negative DELETE Candidate
 * Modul    : Recruitment - Candidates
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-15-Verify-API-Negative-DELETE-Candidate.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi DELETE /api/v2/recruitment/candidates dengan payload
 *   tidak valid (id tidak ada, array kosong, body malformed) tidak crash
 *   (500) dan tidak menghapus data lain secara tidak sengaja.
 *
 *   [PERINGATAN DESTRUKTIF, DIPATUHI]: TC ini HANYA mengirim payload
 *   id=999999999 (hampir pasti tidak ada), ids=[] (array kosong), dan
 *   ids="abc" (malformed). TIDAK PERNAH mengirim id candidate asli milik
 *   TC lain di suite ini, sesuai peringatan di gap-coverage doc.
 *
 *   [CONFIRMED via discovery run, SUDAH DIVERIFIKASI AMAN sebelum ditulis
 *   sebagai spec]:
 *     - id tidak ada (999999999)  -> 404 "Records Not Found" (bukan 500,
 *       bukan crash, dan tidak menghapus apa pun karena id tidak match).
 *     - ids=[] (array kosong)     -> 404 "Records Not Found" juga (SAMA
 *       amannya dengan id tidak ada -- CONFIRMED tidak menghapus seluruh
 *       tabel candidates, no-op aman).
 *     - ids="abc" (malformed)     -> 422 "Invalid Parameter" dengan
 *       invalidParamKeys=["ids"], bukan 500.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-15-Verify-API-Negative-DELETE-Candidate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-RECRUITMENT-CANDIDATE-15: DELETE candidates with invalid payloads is handled safely', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-15', 'API Negative DELETE Candidate', env.baseURL, page);
  const url = `${env.baseURL}/web/index.php/api/v2/recruitment/candidates`;

  report.step('[API] DELETE dengan id yang hampir pasti tidak ada (999999999)');
  const r1 = await page.request.delete(url, { data: { ids: [999999999] } });
  report.check('Id tidak ada -> status BUKAN 500', r1.status() !== 500, `status=${r1.status()}`);
  report.check('Id tidak ada -> status 404 (Records Not Found)', r1.status() === 404, `status=${r1.status()}`);

  report.step('[API] DELETE dengan array ids KOSONG (edge case destruktif -- diverifikasi aman sebelum dites)');
  const r2 = await page.request.delete(url, { data: { ids: [] } });
  report.check('Array kosong -> status BUKAN 500', r2.status() !== 500, `status=${r2.status()}`);
  report.check(
    'Array kosong -> no-op aman (404 Records Not Found, BUKAN 200 yang menandakan mass-delete)',
    r2.status() === 404,
    `status=${r2.status()}`,
  );

  report.step('[API] DELETE dengan body malformed (ids bukan array, melainkan string)');
  const r3 = await page.request.delete(url, { data: { ids: 'abc' } });
  report.check('Body malformed -> status BUKAN 500', r3.status() !== 500, `status=${r3.status()}`);
  report.check('Body malformed -> status 422 (Invalid Parameter)', r3.status() === 422, `status=${r3.status()}`);

  report.print();
});
