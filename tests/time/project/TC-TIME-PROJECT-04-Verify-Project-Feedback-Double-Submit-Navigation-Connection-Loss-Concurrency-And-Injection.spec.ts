/**
 * ================================================================================
 * TC-TIME-PROJECT-04 — Verify Project: Save Feedback, Double-Click Save, Refresh Without Save, Dropped Connection, Two-Admin Concurrency, Emoji And SQL Injection In Name
 * Modul    : Time > Project Info > Projects (U064)
 * Kategori : Positive (+) 1.8 | Edge (!) 4.1 4.2 4.3 4.5 4.7 | Security (S) 5.1-SQLi | Usability 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-PROJECT-04-Verify-Project-Feedback-Double-Submit-Navigation-Connection-Loss-Concurrency-And-Injection.spec.ts
 * Path     : tests/time/project/
 * ================================================================================
 *
 * LATAR: menutup 8 kode GAP terakhir U064 Projects. Form Add Project (/time/saveProject):
 * Name (input pertama), Customer Name (autocomplete, "Type for hints..."), Description
 * (textarea opsional), Project Admins (autocomplete kedua, opsional, multi). Dibuktikan LIVE
 * 24 Nov 2026 via UI + API POST/GET time/projects.
 *
 * TUJUAN:
 *   1.8        Save valid -> toast "Successfully Saved", project baru muncul di daftar.
 *   4.1        Emoji di Name -> SENGAJA FAILED (BG-496): GET validation/project-name 500
 *              utk emoji, Save macet permanen (tidak pernah mengirim POST).
 *   4.2        Klik ganda Save -> tidak ada 2 project duplikat (server menolak nama kedua
 *              krn constraint unique yg sudah dikonfirmasi di TC-TIME-PROJECT-01).
 *   4.3        Ubah Name lalu refresh TANPA Save -> project tidak tercipta.
 *   4.5        Koneksi diputus saat Save (POST di-abort) -> tetap di form, tidak ada project.
 *   4.7        Dua Admin membuat project dgn nama SAMA hampir bersamaan -> tepat SATU berhasil
 *              (constraint unique server-side menang, bukan race yg merusak data).
 *   5.1-SQLi   Payload SQL di Name -> tersimpan sbg teks literal, tidak ada DB error/bypass.
 *   8.4        Pesan error nama duplikat konsisten formatnya dgn modul lain ("Already Exists").
 *
 * HASIL 24 Nov 2026: SENGAJA FAILED (4.1). BUG BARU BG-496 (Medium) — GET
 * /api/v2/time/validation/project-name?projectName=<emoji> -> 500 Internal Server Error
 * (bukan 422), diikuti uncaught exception di client. Scope dibuktikan via probe API
 * langsung: Jepang/Arab/aksen non-ASCII semua 200, HANYA karakter emoji (astral/4-byte
 * UTF-8, mis. U+1F389) yg memicu 500 — pola klasik mismatch charset DB (utf8 vs
 * utf8mb4). Dampak: field Name pd Add Project jd TIDAK BISA dipakai sama sekali kalau
 * user mengetik emoji apa pun, krn validasi real-time (on-keystroke) macet di exception
 * sblm tombol Save bisa memicu POST. 7/8 check lain lolos, tidak ada bug lain. MENUTUP
 * U064 SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/project/TC-TIME-PROJECT-04-Verify-Project-Feedback-Double-Submit-Navigation-Connection-Loss-Concurrency-And-Injection.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { loginAs } from '../../../src/utils/loginAs';

const API = '/web/index.php/api/v2/time';

test('TC-TIME-PROJECT-04: project feedback, double-submit, navigation, connection loss, concurrency, injection', async ({ page, browser }, testInfo) => {
  testInfo.setTimeout(200_000);
  const report = new TestReport('TC-TIME-PROJECT-04', 'Project Feedback DoubleSubmit Navigation ConnectionLoss Concurrency Injection', env.baseURL, page, [
    /validation\/project-name.*500/, /Failed to load resource.*500/, /Failed to load resource.*422/,
    /net::ERR_CONNECTION_RESET/, /Uncaught exception: fe/,
  ]);
  const stamp = Date.now();

  report.step('Setup: Customer utk semua project uji');
  const custId = (await (await page.request.post(`${API}/customers`, { data: { name: `QaProjCust ${stamp}`, description: '' } })).json().catch(() => null))?.data?.id as number;
  report.check('Setup customer OK', !!custId, `custId=${custId}`);

  const selectCustomer = async (p: typeof page) => {
    const input = p.getByPlaceholder('Type for hints...').first();
    const option = p.locator('.oxd-autocomplete-option').filter({ hasText: String(stamp) }).first();
    const resp = p.waitForResponse((r) => r.url().includes('time/customers?name=') && r.request().method() === 'GET', { timeout: 20_000 }).catch(() => null);
    await input.fill(`QaProjCust ${stamp}`);
    await resp;
    await option.waitFor({ state: 'visible', timeout: 10_000 });
    await option.click();
  };

  report.step('1.8 Save valid -> toast sukses, muncul di daftar');
  await page.goto('/web/index.php/time/saveProject');
  const validName = `QaProj ${stamp}`;
  await page.locator('form input').first().fill(validName);
  await selectCustomer(page);
  const post1 = page.waitForResponse((r) => r.url().endsWith('/time/projects') && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null);
  await page.getByRole('button', { name: 'Save' }).click();
  const r1 = await post1;
  const toast = await page.locator('.oxd-toast').first().innerText({ timeout: 8_000 }).catch(() => '');
  report.check('1.8 [U064] Save valid -> POST 200 & toast "Successfully Saved"', r1?.status() === 200 && /Success/.test(toast), `status=${r1?.status()} toast=${toast.replace(/\s+/g, ' ')}`);
  await page.waitForURL('**/time/viewProjects', { timeout: 10_000 }).catch(() => page.goto('/web/index.php/time/viewProjects'));
  await page.locator('input[placeholder="Search"]').first().fill(validName).catch(() => {});
  const searchBtn = page.getByRole('button', { name: 'Search' });
  if (await searchBtn.isVisible().catch(() => false)) await searchBtn.click();
  await page.waitForLoadState('networkidle');
  report.check('1.8 [U064] Project baru tampil di daftar', (await page.locator('.oxd-table-card').filter({ hasText: validName }).count()) > 0);

  report.step('4.1 Emoji di Name -> validasi real-time crash (SENGAJA FAILED, BG-496)');
  const emojiName = `QaProj 🎉 ${stamp}`;
  const validateResp = await page.request.get(`${API}/validation/project-name?projectName=${encodeURIComponent(emojiName)}`);
  report.check('4.1 [U064] SENGAJA FAILED: emoji di Name -> GET validation/project-name 500, bukan 200/422 (BG-496)', validateResp.status() !== 500, `status=${validateResp.status()}`);
  await page.goto('/web/index.php/time/saveProject');
  await page.locator('form input').first().fill(emojiName);
  await selectCustomer(page);
  const postU = page.waitForResponse((r) => r.url().endsWith('/time/projects') && r.request().method() === 'POST', { timeout: 10_000 }).catch(() => null);
  await page.getByRole('button', { name: 'Save' }).click();
  const rU = await postU;
  report.check('4.1 [U064] Save dgn emoji tidak pernah mengirim POST (UI macet akibat BG-496, bukan validasi sukses)', rU === null, `rU=${rU?.status() ?? 'null (timeout, sesuai ekspektasi bug)'}`);

  report.step('5.1-SQLi Payload SQL di Name');
  const sqliName = `QaProjSqli' OR '1'='1 ${stamp}`;
  const sqliResp = await page.request.post(`${API}/projects`, { data: { name: sqliName, customerId: custId, description: null, projectAdminsEmpNumbers: [] } });
  const sqliBody = await sqliResp.json().catch(() => null);
  report.check('5.1-SQLi [U064] Payload SQL di name -> 200, tersimpan sbg teks literal, tidak ada DB error', sqliResp.status() === 200 && sqliBody?.data?.name === sqliName, `status=${sqliResp.status()}`);
  const listAfterSqli = await page.request.get(`${API}/projects?limit=0`);
  report.check('5.1-SQLi [U064] List masih bisa diambil normal setelahnya (tidak ada bypass/crash)', listAfterSqli.status() === 200);

  report.step('8.4 Pesan error nama duplikat');
  const dupResp = await page.request.post(`${API}/projects`, { data: { name: validName, customerId: custId, description: null, projectAdminsEmpNumbers: [] } });
  const dupBody = await dupResp.json().catch(() => null);
  report.check('8.4 [U064] Nama duplikat -> 422 dgn pesan "Already Exists" (format konsisten dgn modul lain)', dupResp.status() === 422 && (dupBody?.error?.data?.invalidParamKeys ?? []).includes('name'), `status=${dupResp.status()} keys=${JSON.stringify(dupBody?.error?.data?.invalidParamKeys)}`);

  report.step('4.2 Klik ganda Save');
  const dblName = `QaProjDbl ${stamp}`;
  await page.goto('/web/index.php/time/saveProject');
  await page.locator('form input').first().fill(dblName);
  await selectCustomer(page);
  await page.getByRole('button', { name: 'Save' }).dblclick();
  await page.waitForTimeout(5000);
  const dblCount = (await (await page.request.get(`${API}/projects?limit=0`)).json().catch(() => ({ data: [] })))?.data?.filter((p: { name: string }) => p.name === dblName).length ?? 0;
  report.check('4.2 [U064] Klik ganda Save -> tepat 1 project tersimpan (unique constraint menolak duplikat)', dblCount === 1, `project tersimpan=${dblCount}`);

  report.step('4.3 Refresh tanpa Save');
  const refreshName = `QaProjRefresh ${stamp}`;
  await page.goto('/web/index.php/time/saveProject');
  await page.locator('form input').first().fill(refreshName);
  await page.reload();
  await page.waitForLoadState('networkidle');
  const refreshCount = (await (await page.request.get(`${API}/projects?limit=0`)).json().catch(() => ({ data: [] })))?.data?.filter((p: { name: string }) => p.name === refreshName).length ?? 0;
  report.check('4.3 [U064] Isi Name lalu refresh TANPA Save -> project TIDAK tercipta', refreshCount === 0, `tersimpan=${refreshCount}`);

  report.step('4.5 Koneksi diputus saat Save');
  const dropName = `QaProjDrop ${stamp}`;
  await page.goto('/web/index.php/time/saveProject');
  await page.locator('form input').first().fill(dropName);
  await selectCustomer(page);
  await page.route('**/api/v2/time/projects', (route) => route.abort('connectionreset'));
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(2000);
  await page.unroute('**/api/v2/time/projects');
  const dropCount = (await (await page.request.get(`${API}/projects?limit=0`)).json().catch(() => ({ data: [] })))?.data?.filter((p: { name: string }) => p.name === dropName).length ?? 0;
  report.check('4.5 [U064] Koneksi diputus saat Save -> tetap di form, project TIDAK tercipta', page.url().includes('saveProject') && dropCount === 0, `url=${page.url()} tersimpan=${dropCount}`);

  report.step('4.7 Dua Admin membuat project dgn nama SAMA hampir bersamaan');
  const raceName = `QaProjRace ${stamp}`;
  const b = await loginAs(browser, env.username, env.password);
  try {
    const [rA, rB] = await Promise.all([
      page.request.post(`${API}/projects`, { data: { name: raceName, customerId: custId, description: null, projectAdminsEmpNumbers: [] } }),
      b.page.request.post(`${API}/projects`, { data: { name: raceName, customerId: custId, description: null, projectAdminsEmpNumbers: [] } }),
    ]);
    const okCount = [rA, rB].filter((r) => r.status() === 200).length;
    const conflictCount = [rA, rB].filter((r) => r.status() === 422).length;
    report.check('4.7 [U064] Dua Admin, nama sama, hampir bersamaan -> tepat 1 berhasil, 1 ditolak 422 (no race corruption)', okCount === 1 && conflictCount === 1, `statusA=${rA.status()} statusB=${rB.status()}`);
  } finally {
    await b.close();
  }

  report.print();
});
