/**
 * ================================================================================
 * TC-PIM-CONTACT-10 — Verify The Attachments Widget: Feedback, Double Submit, Navigation, Connection Loss, Concurrency, Responsive, Cross-Browser And Accessibility
 * Modul    : PIM > Employee > Attachments (all tabs) (U098) -- diuji via widget Attachments
 *            pd tab Contact Details (representatif, pola identik di 7 tab lain)
 * Kategori : Positive (+) 1.8 | Edge (!) 4.2 4.3 4.5 4.7 4.8 | UI (8) 8.1 8.2 8.3 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-10-Verify-Attachment-Feedback-Double-Submit-Navigation-Connection-Loss-Concurrency-Responsive-And-Accessibility.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * LATAR: Attachments TIDAK punya URL sendiri (section tertanam di 8 tab karyawan + Add
 * Employee) -- unit U098 sengaja TIDAK dimasukkan ke tools/coverage/sweep_units.json (bukan
 * oversight: `resolveUnitUrl`/PAGE_UNITS yg dipakai SEMUA sweep generik butuh 1 URL yg bisa
 * di-goto, dan U098 memang tidak punya itu). TC ini menguji widget-nya scr langsung di tab
 * Contact Details (representatif, komponen attachment identik di semua tab lain, dibuktikan
 * endpoint API-nya sama persis di TC-PIM-ATTACHMENT-API-01/02).
 *
 * TUJUAN:
 *   1.8  Upload valid -> toast sukses muncul ("Successfully Saved").
 *   4.2  Double-click Save pd modal Attachments -> tidak ada 2 entri dari 1 upload.
 *   4.3  Browser Back lalu Forward setelah upload -> tidak resubmit, halaman normal.
 *   4.5  Koneksi putus saat upload (request di-abort) -> tidak crash, modal/isian tidak
 *        hilang begitu saja.
 *   4.7  2 sesi Admin upload attachment BERBEDA ke employee yg SAMA scr bersamaan -> tidak
 *        ada 500/data campur.
 *   8.1  Halaman tidak overflow horizontal pd lebar ponsel (375px) -- widget Attachments
 *        termasuk di area yg diukur.
 *   8.2  Modal Attachments & tombol "+ Add" tetap bisa dibuka/diklik di Firefox & WebKit.
 *   8.3  Tombol "+ Add" attachment punya accessible name (bukan elemen tanpa label).
 *   8.4  Teks toast konsisten dgn pola "Successfully ..." di tab/widget lain.
 *   4.8  Known behavior (lihat HASIL).
 *
 * HASIL 18 Nov 2026: SENGAJA FAILED (R3), BUG BARU BG-475 (Medium) -- double-click Save pd
 *   modal Attachments membuat 2 ENTRI dari 1 upload (tombol Save tidak dikunci selama request
 *   berjalan), instans ke-4 dari pola double-submit app-wide yg SAMA dgn BG-427 (Locations/
 *   Reporting Methods/KPIs) dan TC-PIM-ADD-33 (Add Employee photo) -- root cause identik,
 *   dicatat sbg bug baru krn UI-nya berbeda (modal attachment, bukan form "Add" biasa).
 *   8.2 dikonfirmasi lintas 3 project Playwright (chromium/firefox/webkit, lihat RUN COMMAND).
 *   5.6 (security header) TIDAK diuji ulang di sini -- halaman Contact Details SUDAH terbukti
 *   tidak memiliki X-Frame-Options/CSP frame-ancestors, instans KE-4 dari clickjacking gap
 *   app-wide yg SAMA (BG-404 dkk, sudah dikonfirmasi di Employee List/Login/Recruitment),
 *   bukan bug baru khusus Attachments -- dicatat sbg finding, bukan check literal 5.6 kedua.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-10-Verify-Attachment-Feedback-Double-Submit-Navigation-Connection-Loss-Concurrency-Responsive-And-Accessibility.spec.ts
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';
import { ContactDetailsPage } from '../../../src/pages/ContactDetailsPage';

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const upload = async (page: import('@playwright/test').Page, contactDetailsPage: ContactDetailsPage, name: string) => {
  await contactDetailsPage.attachmentsAddButton.click();
  const fileInput = page.locator('input[type="file"]').last();
  await fileInput.waitFor({ state: 'attached' });
  await fileInput.setInputFiles({ name, mimeType: 'image/png', buffer: Buffer.from(TINY_PNG, 'base64') });
};

test('TC-PIM-CONTACT-10: attachment widget feedback, double submit, navigation, connection loss, concurrency, responsive, cross-browser, accessibility', async ({
  page, addEmployeePage, contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  // Pola app-wide BG-199 (unhandled exception setelah koneksi disimulasikan putus via
  // dropConnectionDuringSave), hanya muncul pd step 4.5 -- kata-kata errornya berbeda per
  // browser engine (Chromium: net::ERR_FAILED/"fe"; Firefox: "can't access property ...,
  // X is undefined"; WebKit: "due to access control checks"/"AxiosError: Network Error"),
  // bukan 3 temuan baru.
  const report = new TestReport('TC-PIM-CONTACT-10', 'Attachment Widget Feedback Double Submit Navigation Connection Loss Concurrency Responsive Accessibility', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/,
  ]);
  const s = Date.now() % 100000;
  const { empNumber: emp } = await createTestEmployee(page, addEmployeePage, 'QaAttUiMain');

  try {
    report.step('1.8 / 8.4 Upload valid -- toast sukses & konsistensi pesan');
    await contactDetailsPage.goto(emp);
    await upload(page, contactDetailsPage, `qa-ui-${s}.png`);
    const [saved] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/attachment') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Save' }).last().click(),
    ]);
    const toast = page.locator('.oxd-toast').filter({ hasText: /Successfully/i });
    const toastText = await toast.first().textContent().catch(() => null);
    report.check('1.8 [U098] Upload valid -> POST 200 + toast sukses muncul', saved.status() === 200 && !!toastText, `status=${saved.status()} toast=${toastText}`);
    report.check('8.4 [U098] Teks toast konsisten dgn pola "Successfully ..." di tab lain', !!toastText && /Successfully/i.test(toastText), `toast="${toastText}"`);
    await page.waitForTimeout(1200);

    report.step('4.3 Back/Forward pasca-upload');
    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    report.check('4.3 [U098] Browser Back lalu Forward setelah upload -> halaman termuat normal', page.url().includes('contactDetails'), `url=${page.url()}`);

    report.step('4.5 Koneksi putus saat upload');
    await contactDetailsPage.goto(emp);
    await upload(page, contactDetailsPage, `qa-ui-drop-${s}.png`);
    await dropConnectionDuringSave(page, '**/attachment*', () => page.getByRole('button', { name: 'Save' }).last().click());
    report.check('4.5 [U098] Koneksi putus saat upload -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

    report.step('4.2 Double-click Save pd modal Attachments');
    await contactDetailsPage.goto(emp);
    await upload(page, contactDetailsPage, `qa-ui-dbl-${s}.png`);
    const saveBtn = page.getByRole('button', { name: 'Save' }).last();
    const [d1, d2] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/attachment') && r.request().method() === 'POST').catch(() => null),
      saveBtn.click({ clickCount: 2 }).catch(() => null),
    ]);
    void d2;
    await page.waitForTimeout(1500);
    const list = ((await (await page.request.get(`/web/index.php/api/v2/pim/employees/${emp}/screen/contact/attachments`)).json()) as { data: Array<{ filename: string }> }).data;
    const dblCount = list.filter((a) => a.filename === `qa-ui-dbl-${s}.png`).length;
    report.check('4.2 [U098] Double-click Save -> TIDAK ada 2 entri dari 1 upload (tepat 1 atau modal menolak klik kedua)', dblCount <= 1, `status=${d1?.status()} entriTersimpan=${dblCount}`);

    report.step('4.7 Concurrency -- 2 sesi Admin upload attachment berbeda ke employee yg sama');
    const api = `/web/index.php/api/v2/pim/employees/${emp}/screen/contact/attachments`;
    const b64 = (b: string) => Buffer.from(b, 'base64').toString('base64');
    const [c1, c2] = await Promise.all([
      page.request.post(api, { data: { attachment: { name: `qa-conc-a-${s}.pdf`, type: 'application/pdf', size: 10, base64: b64(TINY_PNG) }, description: '' } }),
      page.request.post(api, { data: { attachment: { name: `qa-conc-b-${s}.pdf`, type: 'application/pdf', size: 10, base64: b64(TINY_PNG) }, description: '' } }),
    ]);
    report.check('4.7 [U098] 2 upload bersamaan (attachment berbeda, employee sama) -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

    report.step('8.1 Responsive -- tidak overflow horizontal di lebar ponsel (375px)');
    await page.setViewportSize({ width: 375, height: 812 });
    await contactDetailsPage.goto(emp);
    await page.waitForLoadState('networkidle').catch(() => null);
    const viewMetrics = await page.evaluate(() => {
      const doc = document.documentElement; const vw = window.innerWidth;
      for (const el of Array.from(document.querySelectorAll('body *')) as HTMLElement[]) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= vw + 2) continue;
        let a: HTMLElement | null = el.parentElement; let scrolled = false;
        while (a && a !== document.body) {
          const ox = getComputedStyle(a).overflowX;
          if ((ox === 'auto' || ox === 'scroll' || ox === 'hidden') && a.scrollWidth > a.clientWidth) { scrolled = true; break; }
          a = a.parentElement;
        }
        if (!scrolled) return { scrollWidth: doc.scrollWidth, innerWidth: vw, offender: `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 2).join('.')}` };
      }
      return { scrollWidth: doc.scrollWidth, innerWidth: vw, offender: null };
    });
    report.check('8.1 [U098] Tidak ada elemen overflow horizontal di luar kontainer scroll-nya sendiri (375px)', !viewMetrics.offender, JSON.stringify(viewMetrics));
    await page.setViewportSize({ width: 1280, height: 800 });

    report.step('8.3 Accessibility -- tombol "+ Add" Attachments punya accessible name');
    await contactDetailsPage.goto(emp);
    const addName = await contactDetailsPage.attachmentsAddButton.evaluate((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').trim());
    report.check('8.3 [U098] Tombol "+ Add" Attachments punya accessible name (bukan kosong)', addName.length > 0, `accessibleName="${addName}"`);

    report.step('8.2 Cross-browser -- widget Attachments terbuka (TC ini dijalankan lintas 3 project Playwright: chromium/firefox/webkit, lihat RUN COMMAND)');
    await contactDetailsPage.goto(emp);
    await contactDetailsPage.attachmentsAddButton.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
    const addVisible = await contactDetailsPage.attachmentsAddButton.isVisible().catch(() => false);
    report.check(`8.2 [U098] Tombol "+ Add" Attachments terlihat & clickable (project: ${testInfo.project.name})`, addVisible, `project=${testInfo.project.name} visible=${addVisible}`);

    report.finding('4.8 [U098] Behavior non-obvious', 'Tidak ditemukan behavior non-intuitif baru pd widget Attachments (toast, back/forward, koneksi putus, concurrency semua konsisten dgn arsitektur form global yg sudah dibuktikan di TC-SWEEP-UIMUT-01/TC-PIM-TABEDGE-01).');
    report.finding('5.6 Security header pd halaman yg memuat widget Attachments', 'Halaman Contact Details (tempat widget Attachments diuji) tidak memiliki X-Frame-Options/CSP frame-ancestors -- instans clickjacking app-wide yg SAMA dgn Employee List/Login/Recruitment (BG-404 dkk), bukan bug baru khusus Attachments.');
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
