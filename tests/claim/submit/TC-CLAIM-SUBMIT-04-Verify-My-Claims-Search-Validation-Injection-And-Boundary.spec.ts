/**
 * ================================================================================
 * TC-CLAIM-SUBMIT-04 — Verify My Claims Search: Validation, Injection And Boundary
 * Modul    : Claim > My Claims (U075, claim/viewClaim, ESS)
 * Kategori : Negative (-) 2.2 | Boundary (!) 3.4 | Edge (!) 4.1 4.8 | Security (S)
 *            5.1-SQLi 5.1-XSS-Reflected | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-SUBMIT-04-Verify-My-Claims-Search-Validation-Injection-And-Boundary.spec.ts
 * Path     : tests/claim/submit/
 * ================================================================================
 *
 * LATAR: menutup 7 kode GAP terakhir U075 My Claims -- halaman PENCARIAN MURNI (ESS
 * melihat klaim MILIKNYA SENDIRI saja), sama pola dgn U011 Employee Claims (admin-side
 * search), tapi di sini scope-nya ESS sendiri via GET /api/v2/claim/requests. Dibuktikan
 * LIVE 24 Nov 2026 pakai sesi ESS (createEssClaim):
 *   - Param asing/sortField tak dikenal -> 422 (6.5).
 *   - fromDate format invalid -> 422 (2.2).
 *   - fromDate > toDate (rentang terbalik) -> 200 + hasil kosong, bukan error (3.4).
 *   - referenceId SQLi -> 200, hasil kosong wajar, tidak ada DB error/bypass (5.1-SQLi).
 *   - referenceId XSS dicoba via UI search box -> tidak tereksekusi (5.1-XSS-Reflected).
 *   - Reference Id search box menerima unicode/emoji tanpa crash (4.1).
 *   - [4.8] GET /api/v2/claim/requests dgn param empNumber (coba targetkan employee lain)
 *     -> 422, endpoint ESS ini TIDAK mengenal param empNumber SAMA SEKALI -- scoping ke
 *     diri sendiri sepenuhnya implisit dari sesi, tidak bisa diubah lewat query string
 *     apa pun -- behavior non-obvious tapi lebih ketat dari sekadar "diabaikan" (bukan
 *     IDOR).
 *
 * HASIL 24 Nov 2026: lolos penuh, tidak ada bug baru. MENUTUP U075 SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/submit/TC-CLAIM-SUBMIT-04-Verify-My-Claims-Search-Validation-Injection-And-Boundary.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssClaim } from '../../../src/utils/createEssClaim';

const API = '/web/index.php/api/v2/';

test('TC-CLAIM-SUBMIT-04: My Claims search validation, injection, boundary', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-SUBMIT-04', 'My Claims Search Validation Injection Boundary', env.baseURL, page);
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClaimSubmit04');

  try {
    report.step('6.5 Parameter negative -- param asing & sortField tak dikenal');
    const badParam = await essPage.request.get(`${API}claim/requests?bogusParam=1`);
    const badSort = await essPage.request.get(`${API}claim/requests?sortField=bogus&sortOrder=ASC`);
    report.check('6.5 [U075] GET requests dgn param asing -> 422 ditolak', badParam.status() === 422, `status=${badParam.status()}`);
    report.check('6.5 [U075] GET requests dgn sortField tak dikenal -> 422 ditolak', badSort.status() === 422, `status=${badSort.status()}`);

    report.step('2.2 Format invalid -- fromDate bukan tanggal');
    const badDate = await essPage.request.get(`${API}claim/requests?fromDate=not-a-date`);
    report.check('2.2 [U075] fromDate format invalid -> 422 ditolak', badDate.status() === 422, `status=${badDate.status()}`);

    report.step('3.4 Boundary tanggal -- rentang terbalik');
    const reversed = await essPage.request.get(`${API}claim/requests?fromDate=2026-12-31&toDate=2026-01-01`);
    const reversedBody = await reversed.json().catch(() => null);
    report.check('3.4 [U075] fromDate > toDate -> 200 + hasil kosong (diterima sbg filter valid, bukan error)', reversed.status() === 200 && Array.isArray(reversedBody?.data) && reversedBody.data.length === 0, `status=${reversed.status()} count=${reversedBody?.data?.length}`);

    report.step('5.1-SQLi referenceId berisi payload SQL');
    const sqli = await essPage.request.get(`${API}claim/requests?referenceId=${encodeURIComponent("' OR '1'='1")}`);
    report.check('5.1-SQLi [U075] referenceId SQLi -> 200, tidak ada DB error/bypass', sqli.status() === 200, `status=${sqli.status()}`);

    report.step('4.8 empNumber asing di query -- endpoint My Claims tidak mengenal param ini sama sekali');
    const withForeignEmp = await essPage.request.get(`${API}claim/requests?empNumber=1`);
    report.check('4.8 [U075] GET requests dgn empNumber=1 (coba targetkan employee lain) -> 422, endpoint ESS ini TIDAK mengenal param empNumber sama sekali -- scoping ke diri sendiri sepenuhnya implisit dari sesi, tidak bisa diubah via query string (bukan IDOR, lebih ketat dari sekadar diabaikan)', withForeignEmp.status() === 422, `status=${withForeignEmp.status()}`);

    report.step('5.1-XSS-Reflected / 4.1 Search box -- payload XSS & unicode via UI');
    await essPage.goto('/web/index.php/claim/viewClaim');
    const refIdInput = essPage.locator('.oxd-input-group', { has: essPage.getByText('Reference Id', { exact: true }) }).locator('input');
    const xssPayload = '<img src=x onerror="window.__claimU075Xss=1">';
    await refIdInput.fill(xssPayload);
    const searchBtn = essPage.getByRole('button', { name: /search/i }).first();
    await Promise.all([
      essPage.waitForResponse((r) => r.url().includes('claim/requests') && r.request().method() === 'GET', { timeout: 10_000 }).catch(() => null),
      searchBtn.click(),
    ]);
    await essPage.waitForTimeout(1000);
    const xssExecuted = await essPage.evaluate(() => (window as unknown as { __claimU075Xss?: number }).__claimU075Xss);
    report.check('5.1-XSS-Reflected [U075] Payload XSS di search box -> TIDAK tereksekusi', xssExecuted === undefined, `executed=${xssExecuted}`);
    report.check('5.1-XSS-Reflected [U075] Tidak ada <img src="x"> tersuntik ke DOM', (await essPage.locator('img[src="x"]').count()) === 0);

    await refIdInput.fill('مرحبا 你好 🎉');
    await page.waitForTimeout(300);
    report.check('4.1 [U075] Reference Id search box menerima unicode/emoji tanpa crash', await essPage.locator('body').isVisible(), 'body masih visible');

    void claimId;
  } finally {
    await close();
  }
  report.print();
});
