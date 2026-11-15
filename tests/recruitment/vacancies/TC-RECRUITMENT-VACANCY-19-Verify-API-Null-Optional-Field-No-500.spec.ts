/**
 * ================================================================================
 * TC-RECRUITMENT-VACANCY-19 — Verify Create Vacancy API Handles null In An Optional Field Without A 500
 * Modul    : Recruitment - Vacancies (API)
 * Kategori : API (A) 6.1 status code benar / 6.5 parameter negatif (array kosong vs null)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-VACANCY-19-Verify-API-Null-Optional-Field-No-500.spec.ts
 * Path     : tests/recruitment/vacancies/
 * ================================================================================
 *
 * TUJUAN:
 *   Description adalah field OPSIONAL di form Add Vacancy (form mengirim ""). Klien API lain
 *   wajar mengirim null untuk "kosong". Server harus menerimanya (200) ATAU menolak dgn 422 yg
 *   jelas -- 500 tidak boleh muncul (taksonomi 6.1).
 *   Root cause dibuktikan live 15 Nov 2026 dgn isolasi satu variabel dari body UI yg sukses:
 *     body UI (description "")            -> 200
 *     sama persis, description null       -> 500 "Unexpected Error Occurred"
 *     jobTitleId / employeeId tak eksis   -> 422 [jobTitleId] / [employeeId] (kontrol: validasi
 *                                            field lain berjalan normal)
 *   -> BUG BG-409. TC sengaja FAILED.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/vacancies/TC-RECRUITMENT-VACANCY-19-Verify-API-Null-Optional-Field-No-500.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { getLoggedInEmployeeName } from '../../../src/utils/getLoggedInEmployeeName';
import { uniqueName } from '../../../src/data/testData';

const VACANCIES = '/web/index.php/api/v2/recruitment/vacancies';

test('TC-RECRUITMENT-VACANCY-19: create vacancy API handles null in an optional field without a 500', async ({ page }) => {
  const report = new TestReport('TC-RECRUITMENT-VACANCY-19', 'API Null Optional Field No 500', env.baseURL, page);
  const me = await getLoggedInEmployeeName(page);
  const jobTitleId = (await (await page.request.get('/web/index.php/api/v2/admin/job-titles?limit=1')).json().catch(() => null))?.data?.[0]?.id as number;
  const body = (overrides: Record<string, unknown>) => ({
    name: uniqueName('QaVacNull'), jobTitleId, employeeId: me.empNumber, numOfPositions: 2, description: '', status: true, isPublished: true, ...overrides,
  });

  report.step('[API] Kontrol: body persis seperti form UI (description "")');
  const ok = await page.request.post(VACANCIES, { data: body({}) });
  report.check('[API] description "" -> 200', ok.status() === 200, `status=${ok.status()}`);

  report.step('[API] Kontrol: field lain invalid ditolak 422');
  const badJob = await page.request.post(VACANCIES, { data: body({ jobTitleId: 999999 }) });
  report.check('[API] jobTitleId tak eksis -> 422', badJob.status() === 422, `status=${badJob.status()}`);
  const badEmp = await page.request.post(VACANCIES, { data: body({ employeeId: 999999 }) });
  report.check('[API] employeeId tak eksis -> 422', badEmp.status() === 422, `status=${badEmp.status()}`);

  report.step('[API] description null (satu-satunya perbedaan dari kontrol)');
  const nullName = uniqueName('QaVacNull');
  const nul = await page.request.post(VACANCIES, { data: body({ name: nullName, description: null }) });
  const text = await nul.text();
  report.check('[API] description null -> bukan 5xx (200 atau 422)', nul.status() === 200 || nul.status() === 422, `status=${nul.status()}, body=${text.slice(0, 120)}`);
  report.check('[API] Respons error tidak membocorkan detail server (stack trace / SQL)', !/exception|stack|sql|\.php/i.test(text), `body=${text.slice(0, 120)}`);

  report.step('[API] Tidak ada vacancy setengah-jadi tersimpan bila request gagal');
  const list = ((await (await page.request.get(`${VACANCIES}?limit=0`)).json().catch(() => null))?.data ?? []) as Array<{ name: string }>;
  const stored = list.filter((v) => v.name === nullName).length;
  report.check('Jumlah vacancy bernama tsb konsisten dgn status respons (200 -> 1, selain itu -> 0)', stored === (nul.status() === 200 ? 1 : 0), `stored=${stored}, status=${nul.status()}`);

  report.print();
});
