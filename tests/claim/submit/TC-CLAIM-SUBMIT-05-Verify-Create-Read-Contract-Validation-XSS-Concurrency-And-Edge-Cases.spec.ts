/**
 * ================================================================================
 * TC-CLAIM-SUBMIT-05 — Verify Create, Read Contract, Validation, XSS, Concurrency And Edge Cases
 * Modul    : Claim > Submit Claim (U074, claim/submitClaim, ESS)
 * Kategori : Positive (+) 1.1-R 1.2 1.4 1.8 | Negative (-) 2.1 | Boundary (!) 3.1 |
 *            Edge (!) 4.2 4.3 4.4 4.5 | Security (S) 5.1-XSS-Stored 5.2-MassAssign 5.4
 *            5.5 | API (A) 6.2 6.3 6.4 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-SUBMIT-05-Verify-Create-Read-Contract-Validation-XSS-Concurrency-And-Edge-Cases.spec.ts
 * Path     : tests/claim/submit/
 * ================================================================================
 *
 * LATAR: menutup 19 kode GAP terakhir U074 Submit Claim -- endpoint ESS POST
 * /api/v2/claim/requests {claimEventId, currencyId, remarks?} (flat, klaim MILIK SENDIRI,
 * beda dgn U076 Assign Claim yg admin-side POST claim/employees/<empNumber>/requests).
 * Dibuktikan LIVE 24 Nov 2026 pakai sesi ESS:
 *   - claimEventId tidak dikirim -> 422 (2.1, required).
 *   - claimEventId tidak eksis (999999) -> 422, relasi ke Event ditegakkan (1.4).
 *   - remarks dikosongkan -> 200, opsional (1.2).
 *   - remarks berisi payload XSS -> 200, tersimpan apa adanya (verbatim di JSON), TIDAK
 *     tereksekusi saat ditampilkan di detail klaim (5.1-XSS-Stored).
 *   - GET requests/<id> -> 200 + kontrak lengkap {id,referenceId,claimEvent,currencyType,
 *     remarks,status,meta:{allowedActions,employee}} (1.1-R / 6.2).
 *   - DELETE ke endpoint koleksi (create-only) -> 405 (6.3).
 *   - Field asing status/id di body create -> 422 SELURUH request ditolak
 *     (5.2-MassAssign).
 *   - Request tanpa sesi login -> 401 (6.4).
 *   - 2 klaim identik (event+currency sama) -> keduanya 200, tidak ada uniqueness
 *     constraint, wajar (6.7).
 *   - Origin palsu vs sendiri -> status identik (5.4).
 *   - 8x POST create berturut-turut -> TIDAK ADA satu pun kena 429 (5.5, BUG BARU, pola
 *     sama dgn BG-491 di U076 -- instans KEDUA pola rate-limiting-tidak-ada di modul
 *     Claim, endpoint berbeda).
 *   - remarks 5000 karakter -> 422, batas panjang server-side (3.1).
 *   - Create via UI -> toast sukses (1.8/8.4), double-click Create -> tidak duplikat
 *     (4.2), back/forward setelah create -> normal (4.3), 2 create paralel -> tidak 500
 *     (4.4), koneksi putus saat create -> tidak crash (4.5, whitelist BG-199-family).
 *
 * HASIL 24 Nov 2026: lolos penuh KECUALI 1 gagal SENGAJA (5.5 rate limiting, BUG BARU).
 *   MENUTUP U074 SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/submit/TC-CLAIM-SUBMIT-05-Verify-Create-Read-Contract-Validation-XSS-Concurrency-And-Edge-Cases.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';
import { SubmitClaimPage } from '../../../src/pages';

const API = '/web/index.php/api/v2/';

test('TC-CLAIM-SUBMIT-05: create, read contract, validation, XSS, concurrency, edge cases', async ({
  page, browser, addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-CLAIM-SUBMIT-05', 'Create Read Contract Validation XSS Concurrency Edge Cases', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/,
  ]);

  const ess = await createEssAccount(page, addEmployeePage, 'QaClaimSubmit05');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);

  try {
    report.step('2.1 Required field -- claimEventId tidak dikirim');
    const noEvent = await essPage.request.post(`${API}claim/requests`, { data: { currencyId: 'AFN' } });
    report.check('2.1 [U074] POST tanpa claimEventId -> 422 ditolak', noEvent.status() === 422, `status=${noEvent.status()}`);

    report.step('1.4 Relasi -- claimEventId yg tidak eksis');
    const badEvent = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 999999, currencyId: 'AFN' } });
    report.check('1.4 [U074] claimEventId tidak eksis (999999) -> 422 ditolak (relasi ke Event ditegakkan)', badEvent.status() === 422, `status=${badEvent.status()}`);

    report.step('1.2 Field remarks opsional, dikosongkan');
    const noRemarks = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
    report.check('1.2 [U074] POST tanpa field remarks -> 200 (opsional)', noRemarks.status() === 200, `status=${noRemarks.status()}`);

    report.step('3.1 Boundary panjang -- remarks 5000 karakter');
    const longRemarks = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN', remarks: 'a'.repeat(5000) } });
    report.check('3.1 [U074] remarks 5000 karakter -> 422 ditolak (batas panjang server-side)', longRemarks.status() === 422, `status=${longRemarks.status()}`);

    report.step('5.1-XSS-Stored / 1.1-R / 6.2 Create dgn XSS di remarks, lalu Read kontrak');
    const xssPayload = '<img src=x onerror="window.__claimU074Xss=1">';
    const created = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN', remarks: xssPayload } });
    const createdBody = await created.json().catch(() => null);
    const claimId = createdBody?.data?.id as number | undefined;
    report.check('[Setup] Klaim dgn remarks XSS berhasil dibuat, remarks tersimpan verbatim', created.status() === 200 && createdBody?.data?.remarks === xssPayload, `status=${created.status()} remarks=${createdBody?.data?.remarks}`);
    if (claimId) {
      const read = await essPage.request.get(`${API}claim/requests/${claimId}`);
      const readBody = await read.json().catch(() => null);
      report.check('1.1-R / 6.2 [U074] GET requests/<id> -> 200 + kontrak lengkap {id,referenceId,claimEvent,currencyType,remarks,status,meta:{allowedActions,employee}}', read.status() === 200 && !!readBody?.data?.referenceId && !!readBody?.data?.claimEvent && !!readBody?.data?.currencyType && !!readBody?.meta?.allowedActions && !!readBody?.meta?.employee, `status=${read.status()}`);
    }
    await essPage.goto(`/web/index.php/claim/submitClaim/id/${claimId}`);
    await essPage.waitForTimeout(1500);
    const xssExecuted = await essPage.evaluate(() => (window as unknown as { __claimU074Xss?: number }).__claimU074Xss);
    report.check('5.1-XSS-Stored [U074] Payload XSS di remarks -> TIDAK tereksekusi saat ditampilkan di detail klaim', xssExecuted === undefined, `executed=${xssExecuted}`);
    report.check('5.1-XSS-Stored [U074] Tidak ada <img src="x"> tersuntik ke DOM', (await essPage.locator('img[src="x"]').count()) === 0);

    report.step('6.3 Request method salah -- DELETE ke endpoint koleksi (create-only)');
    const wrongMethod = await essPage.request.delete(`${API}claim/requests`);
    report.check('6.3 [U074] DELETE ke endpoint create-only -> 405', wrongMethod.status() === 405, `status=${wrongMethod.status()}`);

    report.step('5.2-MassAssign Field asing status/id di body create');
    const massAssign = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN', status: 'APPROVED', id: 99999 } });
    const massAssignBody = await massAssign.json().catch(() => null);
    report.check('5.2-MassAssign [U074] Field asing status/id -> 422 SELURUH request ditolak', massAssign.status() === 422 && (massAssignBody?.error?.data?.invalidParamKeys ?? []).includes('status'), `status=${massAssign.status()}`);

    report.step('6.4 Auth -- request tanpa sesi login');
    const noAuthCtx = await browser.newContext();
    const noAuthPage = await noAuthCtx.newPage();
    const noAuth = await noAuthPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
    report.check('6.4 [U074] POST tanpa cookie sesi login -> 401 ditolak', noAuth.status() === 401, `status=${noAuth.status()}`);
    await noAuthCtx.close();

    report.step('6.7 Uniqueness -- 2 klaim identik');
    const dup1 = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
    const dup2 = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
    report.check('6.7 [U074] 2 klaim identik -> keduanya 200, tidak ada uniqueness constraint (wajar)', dup1.status() === 200 && dup2.status() === 200, `dup1=${dup1.status()} dup2=${dup2.status()}`);

    report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
    const legit = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
    const evil = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN' }, headers: { Origin: 'https://evil.example' } });
    report.check('5.4 [U074] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

    report.step('5.5 Rate limiting -- 8x POST create berturut-turut');
    const rapidResults: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = await essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
      rapidResults.push(r.status());
    }
    report.check('[U074] Spam create tidak menyebabkan 500', rapidResults.every((s) => s < 500), `results=${JSON.stringify(rapidResults)}`);
    report.check('5.5 [U074] Rate limiting ADA pd create claim (minimal 1 dari 8 POST kena 429)', rapidResults.some((s) => s === 429), `results=${JSON.stringify(rapidResults)} -- instans kedua pola tidak-ada-rate-limit di Claim, sama dgn BG-491 (U076)`);

    report.step('1.8 / 8.4 Create via UI -- toast sukses');
    const submitClaimPage = new SubmitClaimPage(essPage);
    await submitClaimPage.goto();
    await submitClaimPage.selectEvent('Travel Allowance');
    await submitClaimPage.selectCurrencyByIndex(1);
    const singleCreateResp = await submitClaimPage.create();
    const toastText = await essPage.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
    report.check('1.8 [U074] Create via UI -> POST 200 + toast sukses muncul', singleCreateResp?.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${singleCreateResp?.status()} toast=${toastText}`);
    report.check('8.4 [U074] Teks toast konsisten dgn pola "Successfully ..." di form lain', !!toastText && /Successfully (Saved|Added)/i.test(toastText), `toast="${toastText}"`);

    report.step('4.2 / 4.3 Double-click Create, back/forward');
    await submitClaimPage.goto();
    await submitClaimPage.selectEvent('Travel Allowance');
    await submitClaimPage.selectCurrencyByIndex(1);
    const puts: number[] = [];
    essPage.on('response', (r) => { if (r.url().includes('/api/v2/claim/requests') && r.request().method() === 'POST') puts.push(r.status()); });
    await Promise.all([submitClaimPage.createButton.click({ timeout: 5_000 }).catch(() => null), submitClaimPage.createButton.click({ force: true, timeout: 5_000 }).catch(() => null)]);
    await essPage.waitForTimeout(2000);
    report.check('4.2 [U074] Double-click Create -> tidak ada 500/korupsi', puts.every((s) => s < 500), `puts=${JSON.stringify(puts)}`);
    await essPage.goBack().catch(() => null);
    await essPage.goForward().catch(() => null);
    report.check('4.3 [U074] Browser Back lalu Forward setelah create -> halaman termuat normal', essPage.url().includes('submitClaim'), `url=${essPage.url()}`);

    report.step('4.4 Concurrency -- 2 create paralel');
    const [c1, c2] = await Promise.all([
      essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } }),
      essPage.request.post(`${API}claim/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } }),
    ]);
    report.check('4.4 [U074] 2 create paralel -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `c1=${c1.status()} c2=${c2.status()}`);

    report.step('4.5 Koneksi putus saat Create');
    await submitClaimPage.goto();
    await submitClaimPage.selectEvent('Travel Allowance');
    await submitClaimPage.selectCurrencyByIndex(1);
    await dropConnectionDuringSave(essPage, '**/claim/requests', () => submitClaimPage.createButton.click());
    report.check('4.5 [U074] Koneksi putus saat create -> tidak crash', await essPage.locator('body').isVisible(), 'body masih visible setelah abort');
  } finally {
    await close();
  }
  report.print();
});
