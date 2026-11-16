/**
 * ================================================================================
 * TC-XMOD-07 — Verify That Saving A Form After The Session Has Expired Sends The User To Login Cleanly, Without Unhandled Script Errors
 * Modul    : Lintas modul (Recruitment Candidate Detail U100, Vacancy Detail U101, PIM Personal Details U088)
 * Kategori : Edge (!) 4.5 | Usability 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-XMOD-07-Verify-Expired-Session-On-Save-Redirects-To-Login-Without-Script-Errors.spec.ts
 * Path     : tests/_global/cross-module/
 * ================================================================================
 *
 * LATAR (probe LIVE 17 Nov 2026): sesi bisa berakhir saat user sedang mengisi form (timeout, logout
 * di tab lain). Request Save/validasi lalu dijawab 401 dan aplikasi mengalihkan ke halaman login --
 * itu benar. Tetapi di ketiga form, pengalihan itu disertai exception JS tak tertangani
 * "Cannot read properties of undefined (reading 'response')": interceptor 401 menolak promise
 * dengan nilai undefined, lalu kode pemanggil membaca error.response.
 *
 * TUJUAN (data uji dibuat lewat API & dihapus):
 *   4.5  Ubah field, hapus cookie sesi, klik Save -> request dijawab 401, dialihkan ke /auth/login,
 *        data di server tidak berubah.
 *   8.4  Tanpa exception JS tak tertangani selama pengalihan (pageerror).
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-441 (Low) -- 4.5 lolos di ketiga form; 8.4 gagal di ketiganya
 *   (exception "Cannot read properties of undefined (reading 'response')").
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/cross-module/TC-XMOD-07-Verify-Expired-Session-On-Save-Redirects-To-Login-Without-Script-Errors.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee, createVacancyWithCandidate } from '../../../src/utils/maintenanceData';
import { API, cleanupRecruitment, formField, getJson } from '../../../src/utils/recruitmentData';

test('TC-XMOD-07: saving after the session expired redirects to login without unhandled script errors', async ({ page }, testInfo) => {
  testInfo.setTimeout(240_000);
  // 401 responses are the expected trigger here; the unhandled exceptions are asserted explicitly per form.
  const report = new TestReport('TC-XMOD-07', 'Expired Session On Save Redirects Cleanly', env.baseURL, page, [/status of 401/, /reading 'response'/]);
  const v = await createVacancyWithCandidate(page.request, 'QaXmodSess');
  const emp = await createEmployee(page.request, 'QaXmodSess', `S${Date.now() % 100000}`);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const FORMS = [
    { unit: 'U100 Recruitment > Candidate Detail', url: `/web/index.php/recruitment/addCandidate/${v.candidateId}`, edit: true, field: 'Keywords', read: async () => (await getJson<{ keywords: string | null }>(page.request, `recruitment/candidates/${v.candidateId}`)).keywords },
    { unit: 'U101 Recruitment > Vacancy Detail', url: `/web/index.php/recruitment/addJobVacancy/${v.vacancyId}`, edit: false, field: 'Vacancy Name', read: async () => (await getJson<{ name: string }>(page.request, `recruitment/vacancies/${v.vacancyId}`)).name },
    { unit: 'U088 PIM > Personal Details', url: `/web/index.php/pim/viewPersonalDetails/empNumber/${emp}`, edit: false, field: 'Other Id', read: async () => (await getJson<{ otherId: string | null }>(page.request, `pim/employees/${emp}/personal-details`)).otherId },
  ];
  try {
    for (const f of FORMS) {
      const tag = `[${f.unit}]`;
      report.step(tag);
      await page.goto(f.url);
      await page.waitForLoadState('networkidle');
      if (f.edit) await page.locator('.oxd-switch-input').first().click();
      const before = await f.read();
      const input = formField(page, f.field);
      await input.fill(`QaSesi${Date.now() % 10000}`);
      errors.length = 0;
      const statuses: number[] = [];
      const on = (r: { url(): string; status(): number }) => { if (r.url().includes('/api/v2/') && r.status() === 401) statuses.push(r.status()); };
      page.on('response', on);
      const cookies = await page.context().cookies();
      await page.context().clearCookies();
      await page.getByRole('button', { name: 'Save' }).first().click();
      const toLogin = await page.waitForURL(/auth\/login/, { timeout: 20_000 }).then(() => true, () => false);
      await page.waitForLoadState('networkidle');
      page.off('response', on);
      await page.context().addCookies(cookies);
      const after = await f.read();
      report.check(`4.5 ${tag} Sesi berakhir lalu Save -> 401, dialihkan ke login & data tidak berubah`, statuses.length > 0 && toLogin && after === before, `401=${statuses.length} login=${toLogin} sebelum=${before} sesudah=${after}`);
      report.check(`8.4 ${tag} Tanpa exception JS tak tertangani saat pengalihan ke login`, errors.length === 0, errors.join(' | ') || 'tidak ada');
    }
  } finally {
    await cleanupRecruitment(page.request, [v.candidateId], [v.vacancyId]);
    await page.request.delete(`${API}pim/employees`, { data: { ids: [emp] } });
  }
  report.print();
});
