/**
 * ================================================================================
 * TC-MAINT-PURGE-CAND-01 — Verify Purging The Candidates Of A Vacancy: List, Empty Vacancy, Cancel, Purge All, And The API Rules
 * Modul    : Maintenance > Purge Records > Candidate Records (U086)
 * Kategori : Positive (+) 1.1-D 1.1-R 1.6 1.8 | Negative (-) 2.6 | Boundary (B) 3.6 |
 *            Edge (!) 4.1 4.6 4.8 | Security (S) 5.1-SQLi 5.1-XSS-Reflected 5.2-BFLAC |
 *            API (A) 6.2 6.3 6.4 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MAINT-PURGE-CAND-01-Verify-Purging-The-Candidates-Of-A-Vacancy-UI-And-API.spec.ts
 * Path     : tests/maintenance/purge-records/
 * ================================================================================
 *
 * KESELAMATAN DATA: hanya lowongan & kandidat buatan TC ini yang di-purge; lowongan dihapus di akhir.
 *
 * TUJUAN (alur & kontrak dibuktikan LIVE 17 Nov 2026):
 *   UI   1.6       autocomplete Vacancy menawarkan lowongan uji.
 *        4.1 / 5.1-SQLi / 5.1-XSS-Reflected  input tidak biasa di kotak cari -> tanpa error/dialog.
 *        1.1-R / 3.6  Search -> "(1) Record Found" & nama kandidat uji (GET maintenance/candidates).
 *        4.6       lowongan tanpa kandidat -> "No Records Found" & tanpa tombol "Purge All".
 *        4.8       dialog "cannot be undone"; "No, Cancel" -> kandidat masih ada.
 *        1.1-D / 1.8  "Yes, Purge" -> DELETE maintenance/candidates/purge 200, toast "Successfully
 *                  Purged", kandidat hilang (GET recruitment/candidates/<id> -> 404).
 *   API  6.2       GET maintenance/candidates -> data[] + meta.total; purge -> {data:{purged:{vacancyId}}}.
 *        6.5 / 2.6 body {}, vacancyId null, "x", 999999 -> 422.
 *        6.3       PATCH -> 405.   6.4 tanpa sesi -> 401.   5.2-BFLAC ESS -> 403 & kandidat tetap ada.
 *
 * RUN COMMAND:
 *   npx playwright test tests/maintenance/purge-records/TC-MAINT-PURGE-CAND-01-Verify-Purging-The-Candidates-Of-A-Vacancy-UI-And-API.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession } from '../../../src/utils/myInfo';
import { createVacancyWithCandidate, openMaintenance, suggestions } from '../../../src/utils/maintenanceData';

const API = '/web/index.php/api/v2/';
const PURGE = `${API}maintenance/candidates/purge`;

test('TC-MAINT-PURGE-CAND-01: purging the candidates of a vacancy - UI and API rules', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-MAINT-PURGE-CAND-01', 'Purging The Candidates Of A Vacancy UI And API', env.baseURL, page);
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const full = await createVacancyWithCandidate(page.request, 'QaPurgeVac');
  const empty = await createVacancyWithCandidate(page.request, 'QaPurgeEmptyVac', false);
  const candExists = async (id?: number) => (await page.request.get(`${API}recruitment/candidates/${id}`)).status() === 200;
  const pickAndSearch = async (name: string) => {
    await suggestions(page, name);
    await page.getByRole('option').filter({ hasText: name }).first().click();
    const list = page.waitForResponse((r) => r.url().includes('/maintenance/candidates?'), { timeout: 20_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Search' }).click();
    const resp = await list;
    await page.waitForLoadState('networkidle');
    return resp;
  };
  try {
    report.step('UI: autocomplete & input tidak biasa');
    await openMaintenance(page, 'purgeCandidateData');
    const opts = await suggestions(page, full.vacancyName);
    report.check('1.6 Autocomplete Vacancy menawarkan lowongan uji', opts.some((o) => o.includes(full.vacancyName)), opts.join(' | ') || '(kosong)');
    for (const [label, q] of [['4.1 Teks Arab', 'مرحبا'], ['5.1-SQLi', "' OR 1=1 --"], ['5.1-XSS-Reflected', '<img src=x onerror=alert(1)>']] as const) {
      const o = await suggestions(page, q);
      const injected = await page.locator('img[src="x"]').count();
      report.check(`4.1 / 5.1-SQLi / 5.1-XSS-Reflected Input tidak biasa (${label}) di kotak cari -> tanpa error, dialog, atau elemen tersuntik`, injected === 0 && dialogs.length === 0, `opsi=${o.length}, img=${injected}, dialog=${dialogs.length}`);
    }

    report.step('UI: lowongan tanpa kandidat');
    await openMaintenance(page, 'purgeCandidateData');
    await pickAndSearch(empty.vacancyName);
    const emptyText = (await page.locator('.orangehrm-background-container').innerText()).replace(/\s+/g, ' ');
    report.check('4.6 Lowongan tanpa kandidat -> "No Records Found" & tanpa tombol "Purge All"', /No Records Found/i.test(emptyText) && (await page.getByRole('button', { name: /Purge All/ }).count()) === 0, emptyText.slice(0, 140));

    report.step('UI: lowongan dgn kandidat, Cancel, Purge All');
    await openMaintenance(page, 'purgeCandidateData');
    const listResp = await pickAndSearch(full.vacancyName);
    const listBody = (await listResp?.json().catch(() => null)) as { data?: Array<{ id: number }>; meta?: { total?: number } } | null;
    report.check('6.2 GET maintenance/candidates -> data[] + meta.total', Array.isArray(listBody?.data) && typeof listBody?.meta?.total === 'number', JSON.stringify(listBody?.meta));
    const resultText = (await page.locator('.orangehrm-background-container').innerText()).replace(/\s+/g, ' ');
    report.check('1.1-R / 3.6 Search -> "(1) Record Found" & nama kandidat uji', /\(1\) Record Found/.test(resultText) && resultText.includes(full.candidateName ?? '#'), resultText.slice(0, 180));
    await page.getByRole('button', { name: /Purge All/ }).click();
    const dialogText = (await page.locator('.oxd-dialog-sheet').innerText().catch(() => '')).replace(/\s+/g, ' ');
    report.check('4.8 Dialog konfirmasi menyatakan purge tidak bisa dibatalkan', /cannot be undone/i.test(dialogText), dialogText.slice(0, 120));
    await page.getByRole('button', { name: 'No, Cancel' }).click();
    report.check('4.8 "No, Cancel" -> kandidat masih ada', await candExists(full.candidateId));
    await page.getByRole('button', { name: /Purge All/ }).click();
    const del = page.waitForResponse((r) => r.url().includes('/maintenance/candidates/purge') && r.request().method() === 'DELETE', { timeout: 20_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Yes, Purge' }).click();
    const delResp = await del;
    const delBody = (await delResp?.json().catch(() => null)) as { data?: { purged?: { vacancyId?: number } } } | null;
    report.check('1.1-D DELETE maintenance/candidates/purge -> 200', delResp?.status() === 200, `status=${delResp?.status()}`);
    report.check('6.2 Respons purge = {data:{purged:{vacancyId}}} utk lowongan uji', delBody?.data?.purged?.vacancyId === full.vacancyId, JSON.stringify(delBody));
    report.check('1.8 Toast "Successfully Purged"', await page.locator('.oxd-toast', { hasText: 'Successfully Purged' }).first().waitFor({ timeout: 10_000 }).then(() => true, () => false));
    const gone = await page.request.get(`${API}recruitment/candidates/${full.candidateId}`);
    report.check('1.1-D Kandidat hilang (GET recruitment/candidates/<id> -> 404)', gone.status() === 404, `status=${gone.status()}`);

    report.step('API: validasi, method, sesi, ESS');
    for (const [label, body] of [['body {}', {}], ['vacancyId null', { vacancyId: null }], ['vacancyId "x"', { vacancyId: 'x' }], ['vacancyId 999999', { vacancyId: 999999 }]] as const) {
      const r = await page.request.delete(PURGE, { data: body });
      report.check(`6.5 / 2.6 ${label} -> 422`, r.status() === 422, `status=${r.status()}`);
    }
    const patch = await page.request.patch(PURGE, { data: {} });
    report.check('6.3 PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const anon = await request.newContext({ baseURL: env.baseURL });
    const noAuth = await anon.delete(PURGE, { data: { vacancyId: empty.vacancyId } });
    await anon.dispose();
    report.check('6.4 Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);
    const essVac = await createVacancyWithCandidate(page.request, 'QaPurgeEssVac');
    const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaPurgeCandEss');
    try {
      const ess = await essPage.request.delete(PURGE, { data: { vacancyId: essVac.vacancyId } });
      report.check('5.2-BFLAC Sesi ESS memanggil purge kandidat -> 403 & kandidat tetap ada', ess.status() === 403 && await candExists(essVac.candidateId), `status=${ess.status()}`);
    } finally {
      await close();
    }
    await page.request.delete(PURGE, { data: { vacancyId: essVac.vacancyId } });
    await page.request.delete(`${API}recruitment/vacancies`, { data: { ids: [essVac.vacancyId] } });
  } finally {
    await page.request.delete(`${API}recruitment/vacancies`, { data: { ids: [full.vacancyId, empty.vacancyId] } });
  }
  report.print();
});
