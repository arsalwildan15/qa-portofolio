/**
 * ================================================================================
 * TC-PIM-ATTACHMENT-API-03 — Verify Attachment: Renamed-Extension Bypass, CSRF, Rate Limiting, Console Warnings And Performance
 * Modul    : PIM > Employee > Attachments (all tabs) (U098)
 * Kategori : Security (S) 5.3-Rename 5.4 5.5 | Non-Functional (7) 7.4 7.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ATTACHMENT-API-03-Verify-Attachment-Rename-Bypass-CSRF-Rate-Limiting-Console-And-Performance.spec.ts
 * Path     : tests/pim/security/
 * ================================================================================
 *
 * LATAR: TC-PIM-ATTACHMENT-API-01/02 sudah menutup CRUD, size limit, content-type allowlist,
 * path traversal, injection, mass assignment, double extension, ESS access control, IDOR, 1.6
 * N/A. Ini menutup 5 kode terakhir, dibuktikan via probe LIVE 18 Nov 2026:
 *   - File dgn header MZ (executable) di-"rename" jadi nama .pdf & type diklaim application/
 *     pdf -> 200 DITERIMA -- pola SAMA dgn BG-462/463 (server tidak cek ISI file thd type yg
 *     diklaim), bukan bug baru, instans ke-5 pola yg sama (sudah tercatat di BG-462).
 *   - POST attachment dgn header Origin palsu vs tanpa Origin -> status identik (200=200) --
 *     konsisten dgn TC-PIM-CSRF-01, Origin tidak divalidasi di endpoint attachment jg.
 *   - 6 POST attachment paralel dlm <6 detik -> SEMUA 200, tidak ada 429/lockout -> tidak ada
 *     rate limit pd create attachment, dicatat sbg finding (R4, bukan bug, sesuai pola 5.5 di
 *     unit lain yg tanpa rate limit jg dicatat finding bukan FAILED).
 *   - Membuka modal "Add" Attachments di UI -> tidak ada console warning dari aplikasi
 *     (selain noise DevTools/third-party yg sudah di-whitelist project-wide).
 *   - GET list & POST create attachment -> waktu respons dlm batas kewajaran demo publik
 *     (bukan SLA keras).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru (5.3-Rename & 5.5 adalah FINDING yg
 *   didokumentasikan, bukan FAILED -- R4: kemampuan sudah dibuktikan tidak ada, bukan "belum
 *   dicoba"; 5.3-Rename sendiri sudah punya bug tercatat di BG-462, tidak diduplikasi di sini).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/security/TC-PIM-ATTACHMENT-API-03-Verify-Attachment-Rename-Bypass-CSRF-Rate-Limiting-Console-And-Performance.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

type Attachment = { id: number; filename: string; fileType: string };
const b64 = (buf: Buffer) => buf.toString('base64');
const LIST_SANITY_MS = 10_000;
const CREATE_SANITY_MS = 10_000;

test('TC-PIM-ATTACHMENT-API-03: renamed-extension bypass, CSRF, rate limiting, console warnings, performance', async ({
  page, addEmployeePage, contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PIM-ATTACHMENT-API-03', 'Attachment Rename Bypass CSRF Rate Limiting Console Performance', env.baseURL);
  const empNumber = await createEmployee(page.request, 'QaPimAttApi3', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${empNumber}/screen/contact/attachments`;
  const createdIds: number[] = [];
  const post = async (name: string, buf: Buffer, headers: Record<string, string> = {}) => {
    const r = await page.request.post(api, { data: { attachment: { name, type: 'application/pdf', size: buf.length, base64: b64(buf) }, description: '' }, headers });
    const data = ((await r.json().catch(() => ({}))) as { data?: Attachment }).data;
    if (data?.id) createdIds.push(data.id);
    return { status: r.status(), data };
  };

  try {
    report.step('5.3-Rename: file dgn header MZ (executable) di-rename jadi nama .pdf, type diklaim application/pdf');
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);
    const renamed = await post(`QaAttRename${Date.now() % 100000}.pdf`, exeBuffer);
    report.check('5.3-Rename [U098] Exe dgn header MZ, nama & type diklaim .pdf -> 200 DITERIMA (pola sama dgn BG-462/463, bukan bug baru)', renamed.status === 200 && renamed.data?.fileType === 'application/pdf', `status=${renamed.status}`);
    report.finding('Validasi isi file thd ekstensi/type diklaim pd rename-bypass', 'Server menerima file dgn konten biner executable (header MZ) selama nama & type yg diklaim client adalah .pdf/application-pdf -- pola yg sama dgn BG-462/463, sudah tercatat, tidak diduplikasi sbg bug baru di sini.');

    report.step('5.4 CSRF: Origin aplikasi sendiri vs Origin palsu');
    const legit = await post(`QaAttCsrfA${Date.now() % 100000}.pdf`, Buffer.from('%PDF-1.4'));
    const evil = await post(`QaAttCsrfB${Date.now() % 100000}.pdf`, Buffer.from('%PDF-1.4'), { Origin: 'https://evil.example' });
    report.check('5.4 [U098] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status === evil.status, `legit=${legit.status} evil=${evil.status}`);

    report.step('5.5 Rate limiting: 6 create paralel dlm waktu singkat');
    const t0 = Date.now();
    const rapid = await Promise.all(Array.from({ length: 6 }, (_, i) => post(`QaAttRapid${i}_${Date.now() % 100000}.pdf`, Buffer.from('%PDF-1.4 rapid'))));
    const elapsedMs = Date.now() - t0;
    const allAccepted = rapid.every((r) => r.status === 200);
    report.check('5.5 [U098] 6 create attachment paralel -> SEMUA 200 (tidak ada 429/lockout)', allAccepted, `statuses=${rapid.map((r) => r.status).join(',')} elapsed=${elapsedMs}ms`);
    report.finding('Rate limiting pada create attachment', `6 request create paralel dlm ${elapsedMs}ms SEMUA diterima (200) -- tidak ada rate limit pd endpoint ini, dicatat sbg finding (bukan bug) sesuai R4.`);

    report.step('7.4 Console warning saat membuka modal Add Attachments (UI)');
    const warnings: string[] = [];
    page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
    const { empNumber: uiEmp } = await createTestEmployee(page, addEmployeePage, 'QaAttConsole');
    await contactDetailsPage.goto(uiEmp);
    await contactDetailsPage.attachmentsAddButton.click();
    await page.waitForTimeout(1000);
    const appWarnings = warnings.filter((w) => !/DevTools|third-party|Download the Vue/i.test(w));
    report.check('7.4 [U098] Tanpa console warning dari aplikasi saat membuka modal Add Attachments', appWarnings.length === 0, appWarnings.slice(0, 3).join(' | ') || 'tidak ada');

    report.step('7.5 Performa: waktu respons GET list & POST create dlm batas kewajaran (bukan SLA)');
    const tList = Date.now();
    const list = await page.request.get(`${api}?limit=20`);
    const listMs = Date.now() - tList;
    const tCreate = Date.now();
    const timedCreate = await post(`QaAttPerf${Date.now() % 100000}.pdf`, Buffer.from('%PDF-1.4 perf'));
    const createMs = Date.now() - tCreate;
    report.check(`7.5 [U098] GET list < ${LIST_SANITY_MS / 1000}s`, list.status() === 200 && listMs < LIST_SANITY_MS, `${listMs}ms`);
    report.check(`7.5 [U098] POST create < ${CREATE_SANITY_MS / 1000}s`, timedCreate.status === 200 && createMs < CREATE_SANITY_MS, `${createMs}ms`);
    report.finding('7.5 Waktu respons Attachment API', `GET list=${listMs}ms, POST create=${createMs}ms (batas kewajaran demo publik, bukan SLA ketat).`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [empNumber] } }).catch(() => null);
  }
  report.print();
});
