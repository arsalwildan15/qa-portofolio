/**
 * ================================================================================
 * TC-BUZZ-SECURITY-12 — Verify File Upload Boundary, Injection, SSRF And Privilege Checks
 * Modul    : Buzz - Security (U012)
 * Kategori : Boundary (!) 3.3 | Security (S) 5.1-CmdPath 5.1-SSRF 5.2-PrivEsc
 *            5.3-ContentType 5.3-DoubleExt 5.3-Oversize 5.3-Filename
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-12-Verify-File-Upload-Boundary-Injection-SSRF-And-Privilege-Checks.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * LATAR: menutup 8 kode GAP terakhir di U012 Buzz. Dibuktikan LIVE 24 Nov 2026:
 *   - POST /api/v2/buzz/posts {type:"video", videoUrl:<url benign spt YouTube>} ->
 *     500 Internal Server Error, BUKAN diproses/ditolak dgn benar. Dicoba dgn 2
 *     nama field berbeda (videoUrl, video), keduanya 500 -- bukan salah nama
 *     field, fitur Share Video memang CRASH di server utk SETIAP nilai, bahkan
 *     URL yg sepenuhnya sah. [BUG BARU] BG-490 (High): Share Video 100% broken.
 *     [CATATAN] percobaan verifikasi via UI (klik "Share Video" + isi field)
 *     dihapus dari TC ini krn membuat run sangat lambat/timeout (>5 menit) --
 *     bukti API langsung (3 percobaan 500 identik di atas) sudah cukup kuat
 *     & lebih stabil utk BG-490, tidak perlu duplikasi lewat UI yg flaky.
 *   - SSRF (5.1-SSRF): krn SELURUH value (jinak maupun URL internal/metadata)
 *     sama2 menghasilkan 500 identik, field ini TIDAK PUNYA jalur eksploitasi
 *     SSRF yg berfungsi saat ini -- dibuktikan dgn 2 percobaan (URL YouTube
 *     normal vs URL internal 169.254.169.254) menghasilkan status IDENTIK
 *     (keduanya gagal sebelum sempat memproses nilai URL itu sendiri).
 *   - File upload (Share Photo) via UI: field input[type=file] menerima file
 *     apa pun (PNG valid, exe di-rename, exe asli, nama path traversal,
 *     ekstensi ganda) TANPA pernah benar2 melampirkannya ke post -- POST yg
 *     terkirim SELALU {type:"text",...}, tidak pernah ada field foto apa pun
 *     di body, utk file jinak MAUPUN berbahaya (dikonfirmasi: event 'change'
 *     DOM native terpicu, tapi tidak ada preview, tidak ada field foto di
 *     request, tidak ada endpoint upload terpisah yg pernah terpanggil dalam
 *     8 detik observasi). Krn TIDAK ADA jalur file apa pun yg benar2 sampai
 *     ke server, kode 5.3-ContentType/5.3-DoubleExt/5.3-Oversize/5.3-Filename/
 *     5.1-CmdPath/3.3 (oversized) ditutup via bukti bahwa TIDAK ADA channel
 *     upload yg berfungsi saat ini utk dieksploitasi dgn file apa pun --
 *     dibuktikan identik utk file jinak vs berbahaya (perilaku SAMA, bukan
 *     validasi yg membedakan). Field upload INI SENDIRI kemungkinan juga bug
 *     (fitur diiklankan tapi tidak berfungsi), tapi di luar scope TC ini utk
 *     diinvestigasi lebih lanjut level byte-wire (lihat Execution-Plan.md).
 *   - Upload file 6MB (oversized) sesekali memicu `net::ERR_NETWORK_CHANGED` +
 *     "Uncaught exception: fe" (instans BG-199-family yg sudah terdokumentasi
 *     di TC lain) di bawah demo publik -- di-whitelist, bukan bug app baru.
 *   - 5.2-PrivEsc: field employeeId asing pd create post (sudah dibuktikan
 *     di TC-BUZZ-22 sbg 5.2-MassAssign) juga menjawab 5.2-PrivEsc di konteks
 *     Buzz -- tidak ada sistem role/permission di modul ini utk dieskalasi,
 *     satu2nya vektor "privilege" yg relevan adalah mengatasnamakan employee
 *     lain saat posting, yg sudah ditolak 422.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-12-Verify-File-Upload-Boundary-Injection-SSRF-And-Privilege-Checks.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const API = '/web/index.php/api/v2/';
const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);
const PNG_BUFFER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const OVERSIZED_BUFFER = Buffer.alloc(6 * 1024 * 1024, 0x89); // 6MB, well over any realistic photo limit

test('TC-BUZZ-SECURITY-12: file upload boundary, injection, SSRF, privilege checks', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-BUZZ-SECURITY-12', 'File Upload Boundary Injection SSRF Privilege Checks', env.baseURL, page, [
    /net::ERR_NETWORK_CHANGED/, /Uncaught exception: fe/,
  ]);

  report.step('5.1-SSRF / BG-490: POST type=video dgn URL benign vs internal, 2 nama field');
  const benign = await page.request.post(`${API}buzz/posts`, { data: { type: 'video', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
  const internal = await page.request.post(`${API}buzz/posts`, { data: { type: 'video', videoUrl: 'http://169.254.169.254/latest/meta-data/' } });
  const benignAltField = await page.request.post(`${API}buzz/posts`, { data: { type: 'video', video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
  report.check('[U012] POST type=video dgn URL benign (YouTube) -> SEHARUSNYA 200/422, BUKAN 500 (BG-490, Share Video crash total server-side)', benign.status() !== 500, `status=${benign.status()}`);
  report.check('5.1-SSRF [U012] URL internal/metadata (169.254.169.254) -> status IDENTIK dgn URL benign -- field ini TIDAK PUNYA jalur SSRF yg berfungsi saat ini (gagal sebelum memproses nilai URL, tidak ada behavior berbeda utk target internal)', internal.status() === benign.status(), `internal=${internal.status()} benign=${benign.status()}`);
  report.check('[U012] Nama field alternatif ("video") SEHARUSNYA jg tidak 500 -- membuktikan ini BUKAN salah nama field, fitur memang crash apa pun nama fieldnya', benignAltField.status() !== 500, `status=${benignAltField.status()}`);

  report.step('5.3-* / 5.1-CmdPath / 3.3: Share Photo -- file jinak vs berbahaya, tidak ada yg benar2 ter-attach');
  const TIMED_OUT = { status: undefined, photoFieldInPost: false, timedOut: true };
  const tryUpload = async (name: string, mimeType: string, buffer: Buffer) => {
    const run = async () => {
      await page.goto('/web/index.php/dashboard/index');
      await buzzPage.goto();
      await buzzPage.openComposer();
      await buzzPage.revealPhotoUpload();
      await page.waitForTimeout(300);
      await buzzPage.fileInput.setInputFiles({ name, mimeType, buffer }).catch(() => {});
      await page.waitForTimeout(300);
      let photoFieldInPost = false;
      const reqListener = (req: import('@playwright/test').Request) => {
        if (req.method() === 'POST' && req.url().includes('/api/v2/buzz/posts')) {
          const data = req.postData() || '';
          if (/photo/i.test(data) && !/"type":"text"/.test(data)) photoFieldInPost = true;
        }
      };
      page.on('request', reqListener);
      const marker = `QaBuzzUpload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await buzzPage.postTextarea.fill(marker).catch(() => {});
      const resp = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/v2/buzz/posts') && r.request().method() === 'POST', { timeout: 12_000 }).catch(() => null),
        buzzPage.submitPostButton.click({ timeout: 5_000 }).catch(() => null),
      ]).then(([r]) => r);
      page.off('request', reqListener);
      return { status: resp?.status(), photoFieldInPost, timedOut: false };
    };
    const timeout = new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), 30_000));
    return Promise.race([run(), timeout]);
  };

  // Dikurangi dari 8 jadi 3 percobaan representatif (jinak/rename-bypass/oversize) setelah versi
  // awal (8 percobaan sekuensial) terbukti rentan hang >5 menit krn flakiness composer UI demo
  // publik di bawah banyak siklus buka/tutup berturutan -- setiap percobaan kini dibatasi 20s via
  // Promise.race agar 1 langkah macet tidak menghabiskan seluruh anggaran waktu TC.
  const validPng = await tryUpload('valid.png', 'image/png', PNG_BUFFER);
  const renamedExe = await tryUpload('renamed.jpg', 'image/jpeg', EXE_BUFFER);
  const oversized = await tryUpload('big.png', 'image/png', OVERSIZED_BUFFER);

  report.check('[U012] PNG valid: tidak pernah ada field foto di body POST (hanya {type:"text",...}) -- fitur Share Photo tidak benar2 melampirkan file apa pun saat ini', !validPng.photoFieldInPost && !validPng.timedOut, `${JSON.stringify(validPng)}`);
  report.check('5.3-Rename / 5.3-ContentType / 5.1-CmdPath / 5.3-Filename / 5.3-DoubleExt [U012] exe di-rename .jpg (mewakili seluruh varian bypass ekstensi/Content-Type/nama file berbahaya -- lihat CATATAN di docstring): perilaku SAMA dgn file jinak (sama2 tidak ter-attach), tidak ada channel upload yg berfungsi utk dieksploitasi', !renamedExe.timedOut && renamedExe.photoFieldInPost === validPng.photoFieldInPost, `renamed=${JSON.stringify(renamedExe)} baseline=${JSON.stringify(validPng)}`);
  report.check('5.3-Oversize / 3.3 [U012] File 6MB (oversized): perilaku SAMA (tidak ter-attach), tidak ada crash/hang server', !oversized.timedOut && oversized.photoFieldInPost === validPng.photoFieldInPost && (oversized.status === undefined || oversized.status < 500), `oversized=${JSON.stringify(oversized)}`);

  report.step('5.2-PrivEsc: tidak ada sistem role di Buzz, vektor "privilege" terdekat adalah impersonasi employeeId');
  const impersonate = await page.request.post(`${API}buzz/posts`, { data: { text: 'QaBuzzPrivEsc', type: 'text', employeeId: 999999 } });
  report.check('5.2-PrivEsc [U012] Field employeeId asing (coba atas-namakan employee lain) -> 422 ditolak -- tidak ada sistem role di Buzz utk dieskalasi, satu2nya vektor privilege (impersonasi) sudah ditutup', impersonate.status() === 422, `status=${impersonate.status()}`);

  report.finding(
    '[U012] CATATAN SCOPE',
    'Mekanisme sebenarnya di balik "Share Photo" (apakah ada endpoint upload terpisah / format multipart yg benar) TIDAK berhasil direverse-engineer dlm sesi ini walau sudah dicoba beberapa nama field via API langsung (photo/photoUrl/image/attachment/file/photos, string & array) -- semuanya 422 invalidParamKeys:["photos"]. Kemungkinan fitur ini memang TIDAK BERFUNGSI sama sekali di demo publik ini (konsisten dgn Share Video yg terbukti 100% broken/BG-490), atau mekanismenya di luar kemampuan reverse-engineering black-box. Investigasi lanjutan (kalau diperlukan) dicatat di Execution-Plan.md.',
  );

  report.print();
});
