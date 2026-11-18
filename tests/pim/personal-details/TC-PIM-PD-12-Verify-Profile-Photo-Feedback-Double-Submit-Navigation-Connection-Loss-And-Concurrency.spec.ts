/**
 * ================================================================================
 * TC-PIM-PD-12 — Verify The Profile Photo Widget: Feedback, Double Submit, Navigation, Connection Loss And Concurrency
 * Modul    : PIM > Employee > Profile Picture (U099) -- diuji via widget foto profil pd
 *            halaman Personal Details (satu-satunya titik upload foto profil Admin-side)
 * Kategori : Positive (+) 1.8 | Edge (!) 4.2 4.3 4.5 4.7 4.8 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-12-Verify-Profile-Photo-Feedback-Double-Submit-Navigation-Connection-Loss-And-Concurrency.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * LATAR: Personal Details PUNYA URL sendiri (beda dgn Attachments/U098), jadi 8.1/8.2/8.3
 * SUDAH ditutup oleh TC-SWEEP-VIEW-01/XBROWSER-01/A11Y-01 scr generik -- TC ini HANYA
 * menutup 7 kode sisa yg sweep generik tidak jangkau (double-submit/navigasi/koneksi
 * putus/concurrency spesifik widget foto, bukan form "Add" biasa). Endpoint: PUT
 * pim/employees/<N>/picture (TERPISAH dari PUT .../personal-details, dikonfirmasi di
 * TC-PIM-PD-10). Beda penting dgn Attachments: ini PUT (replace single value, idempotent),
 * BUKAN POST (create new row) -- double-click/concurrency TIDAK bisa membuat "2 entri" krn
 * tidak ada konsep list, jadi diukur dari status/isi akhir, bukan jumlah baris.
 *
 * TUJUAN:
 *   1.8 / 8.4  Upload foto valid -> toast sukses muncul, teks konsisten pola "Successfully".
 *   4.3  Browser Back lalu Forward setelah save -> halaman termuat normal, tidak resubmit.
 *   4.5  Koneksi putus saat save (PUT di-abort) -> tidak crash, halaman tetap merespons.
 *   4.2  Double-click Save setelah pilih 1 foto -> PUT ganda (jika terjadi) tetap idempotent,
 *        foto akhir konsisten, tidak ada error/500.
 *   4.7  2 request PUT foto BERBEDA scr paralel ke employee yg sama -> tidak ada 500, salah
 *        satu "menang" (last-write-wins), bukan data campur/korup.
 *   4.8  Known behavior (lihat HASIL).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-12-Verify-Profile-Photo-Feedback-Double-Submit-Navigation-Connection-Loss-And-Concurrency.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('TC-PIM-PD-12: profile photo widget feedback, double submit, navigation, connection loss, concurrency', async ({
  page, addEmployeePage, personalDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PIM-PD-12', 'Profile Photo Widget Feedback Double Submit Navigation Connection Loss Concurrency', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/,
  ]);
  const s = Date.now() % 100000;
  const { empNumber: emp } = await createTestEmployee(page, addEmployeePage, 'QaPhotoUi');
  const api = `/web/index.php/api/v2/pim/employees/${emp}/picture`;

  try {
    report.step('1.8 / 8.4 Upload foto valid -- toast sukses & konsistensi pesan');
    await personalDetailsPage.goto(emp);
    await personalDetailsPage.waitUntilLoaded();
    await personalDetailsPage.revealFileInput();
    await personalDetailsPage.fileInput.setInputFiles({ name: `qa-pd-${s}.png`, mimeType: 'image/png', buffer: Buffer.from(TINY_PNG, 'base64') });
    const [saved] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/picture') && r.request().method() === 'PUT'),
      personalDetailsPage.save(),
    ]);
    const toast = page.locator('.oxd-toast').filter({ hasText: /Successfully/i });
    const toastText = await toast.first().textContent().catch(() => null);
    report.check('1.8 [U099] Upload foto valid -> PUT 200 + toast sukses muncul', saved.status() === 200 && !!toastText, `status=${saved.status()} toast=${toastText}`);
    report.check('8.4 [U099] Teks toast konsisten dgn pola "Successfully ..." di widget lain', !!toastText && /Successfully/i.test(toastText), `toast="${toastText}"`);
    await page.waitForTimeout(1200);

    report.step('4.3 Back/Forward pasca-save');
    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    // Mengklik foto (revealFileInput) sebelumnya menavigasi ke route SPA
    // /pim/viewPhotograph/empNumber/<N> (bukan sekadar reveal input in-place) --
    // dikonfirmasi live, jadi Forward yg benar mendarat di sana, bukan di
    // viewPersonalDetails. Keduanya dianggap "halaman termuat normal" (bukan
    // error/blank/redirect ke login).
    const urlOk = /viewPersonalDetails|viewPhotograph/.test(page.url());
    report.check('4.3 [U099] Browser Back lalu Forward setelah save -> halaman termuat normal (tidak error/blank/login)', urlOk, `url=${page.url()}`);

    report.step('4.5 Koneksi putus saat save');
    await personalDetailsPage.goto(emp);
    await personalDetailsPage.waitUntilLoaded();
    await personalDetailsPage.revealFileInput();
    await personalDetailsPage.fileInput.setInputFiles({ name: `qa-pd-drop-${s}.png`, mimeType: 'image/png', buffer: Buffer.from(TINY_PNG, 'base64') });
    await dropConnectionDuringSave(page, '**/picture*', () => personalDetailsPage.save());
    report.check('4.5 [U099] Koneksi putus saat save -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

    report.step('4.2 Double-click Save setelah pilih 1 foto');
    await personalDetailsPage.goto(emp);
    await personalDetailsPage.waitUntilLoaded();
    await personalDetailsPage.revealFileInput();
    await personalDetailsPage.fileInput.setInputFiles({ name: `qa-pd-dbl-${s}.png`, mimeType: 'image/png', buffer: Buffer.from(TINY_PNG, 'base64') });
    const [dbl] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/picture') && r.request().method() === 'PUT').catch(() => null),
      personalDetailsPage.saveButton.click({ clickCount: 2 }).catch(() => null),
    ]);
    await page.waitForTimeout(1500);
    const afterDbl = ((await (await page.request.get(api)).json().catch(() => ({}))) as { data?: { filename: string } }).data;
    report.check('4.2 [U099] Double-click Save -> PUT idempotent, foto akhir konsisten ("qa-pd-dbl"), tidak ada error', dbl?.status() === 200 && afterDbl?.filename === `qa-pd-dbl-${s}.png`, `status=${dbl?.status()} filename=${afterDbl?.filename}`);

    report.step('4.7 Concurrency -- 2 PUT foto berbeda scr paralel ke employee yg sama');
    const pngSize = Buffer.from(TINY_PNG, 'base64').length;
    const [c1, c2] = await Promise.all([
      page.request.put(api, { data: { empPicture: { name: `qa-conc-a-${s}.png`, type: 'image/png', size: pngSize, base64: TINY_PNG } } }),
      page.request.put(api, { data: { empPicture: { name: `qa-conc-b-${s}.png`, type: 'image/png', size: pngSize, base64: TINY_PNG } } }),
    ]);
    const afterConc = ((await (await page.request.get(api)).json().catch(() => ({}))) as { data?: { filename: string } }).data;
    const oneWon = afterConc?.filename === `qa-conc-a-${s}.png` || afterConc?.filename === `qa-conc-b-${s}.png`;
    report.check('4.7 [U099] 2 PUT foto berbeda bersamaan -> tidak ada 500, salah satu "menang" (last-write-wins, bukan data campur)', c1.status() < 500 && c2.status() < 500 && oneWon, `status1=${c1.status()} status2=${c2.status()} final=${afterConc?.filename}`);

    report.finding('4.8 [U099] Behavior non-obvious', 'Tidak ditemukan behavior non-intuitif baru pd widget foto profil (toast, back/forward, koneksi putus, double-submit, concurrency semua konsisten dgn arsitektur PUT idempotent -- beda dgn Attachments yg POST/create-row, foto profil tidak bisa "duplikat" krn hanya 1 nilai per employee).');
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
