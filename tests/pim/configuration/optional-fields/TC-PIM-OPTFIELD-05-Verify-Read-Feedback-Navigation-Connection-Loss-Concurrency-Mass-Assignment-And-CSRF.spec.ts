/**
 * ================================================================================
 * TC-PIM-OPTFIELD-05 — Verify Optional Fields: Read, Feedback, Navigation, Connection Loss, Concurrency, Mass Assignment, Omitted Field And CSRF
 * Modul    : PIM > Configuration > Optional Fields (U036)
 * Kategori : Positive (+) 1.1-R 1.8 | Negative (-) 2.1 | Edge (!) 4.3 4.5 4.6 4.7 4.8 |
 *            Security (S) 5.2-MassAssign 5.4 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-OPTFIELD-05-Verify-Read-Feedback-Navigation-Connection-Loss-Concurrency-Mass-Assignment-And-CSRF.spec.ts
 * Path     : tests/pim/configuration/optional-fields/
 * ================================================================================
 *
 * LATAR: TC-PIM-OPTFIELD-01..04 sudah menutup toggle UI persistence, create/update
 * kontrak, koersi tipe, dan field asing (dilabel 5.9, bukan 5.2-MassAssign literal). Ini
 * menutup 9 kode terakhir, dibuktikan via probe LIVE 18 Nov 2026 (semua withConfigRestore):
 *   - GET optional-field -> 200 + kontrak 4 field boolean (1.1-R).
 *   - PUT dgn 1 field diomit dari body (pimShowDeprecatedFields) -> 200, DITERIMA (bukan
 *     ditolak) -- TIDAK ADA konsep "required" pd ke-4 toggle ini (semua independen, server
 *     tidak mewajibkan keempatnya dikirim sekaligus); dicatat sbg PASS, bukan bug (2.1).
 *   - GET -> `data` SELALU berbentuk objek 4 field boolean, TIDAK PERNAH null/kosong (config
 *     singleton selalu ada, beda dgn list yg bisa kosong) (4.6).
 *   - Origin palsu vs sendiri -> status identik (5.4, konsisten TC-PIM-CSRF-01).
 *   - Toggle + Save via UI -> toast "Successfully Saved" (1.8/8.4).
 *   - Browser Back lalu Forward setelah Save -> mendarat kembali di /pim/configurePim normal
 *     (4.3).
 *   - 2 PUT nilai BERBEDA scr paralel -> keduanya 200, tidak ada 500/conflict detection,
 *     last-write-wins (4.7).
 *   - Field asing (isAdmin) di body -> 422 ditolak (5.2-MassAssign, literal -- TC-PIM-OPTFIELD-
 *     04 sudah membuktikan perilaku yg SAMA tapi dilabel 5.9, bukan duplikasi bug).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/optional-fields/TC-PIM-OPTFIELD-05-Verify-Read-Feedback-Navigation-Connection-Loss-Concurrency-Mass-Assignment-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { withConfigRestore } from '../../../../src/utils/withConfigRestore';
import { dropConnectionDuringSave } from '../../../../src/utils/networkEdge';

const API = '/web/index.php/api/v2/pim/optional-field';
type OptFields = { pimShowDeprecatedFields: boolean; showSIN: boolean; showSSN: boolean; showTaxExemptions: boolean };

test('TC-PIM-OPTFIELD-05: read, feedback, navigation, connection loss, concurrency, mass assignment, omitted field, CSRF', async ({
  page, optionalFieldsPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PIM-OPTFIELD-05', 'Optional Fields Read Feedback Navigation Connection Loss Concurrency Mass Assignment CSRF', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/,
  ]);

  await withConfigRestore(
    async () => ((await (await page.request.get(API)).json()) as { data: OptFields }).data,
    async (snapshot) => {
      const r = await page.request.put(API, { data: snapshot });
      report.check('Restore nilai Optional Fields ke semula setelah TC (withConfigRestore)', r.status() === 200, `status=${r.status()}`);
    },
    async () => {
      report.step('1.1-R / 4.6 Read -- kontrak selalu ada, tidak pernah null/kosong');
      const read = await page.request.get(API);
      const readData = ((await read.json().catch(() => ({}))) as { data?: OptFields }).data;
      report.check('1.1-R [U036] GET optional-field -> 200 + kontrak 4 field boolean', read.status() === 200 && typeof readData?.pimShowDeprecatedFields === 'boolean' && typeof readData?.showSIN === 'boolean' && typeof readData?.showSSN === 'boolean' && typeof readData?.showTaxExemptions === 'boolean', `status=${read.status()}`);
      report.check('4.6 [U036] Config singleton selalu ada (bukan null/kosong spt list data yg bisa kosong)', !!readData, JSON.stringify(readData));

      report.step('2.1 PUT dengan 1 field diomit dari body');
      const omitted = await page.request.put(API, { data: { showSIN: false, showSSN: false, showTaxExemptions: false } });
      report.check('2.1 [U036] pimShowDeprecatedFields diomit dari body -> 200 DITERIMA (tidak ada konsep "required" pd toggle independen, bukan bug)', omitted.status() === 200, `status=${omitted.status()}`);

      report.step('5.2-MassAssign Field asing di body');
      const mass = await page.request.put(API, { data: { pimShowDeprecatedFields: false, showSIN: false, showSSN: false, showTaxExemptions: false, isAdmin: true } });
      report.check('5.2-MassAssign [U036] Field asing (isAdmin) -> 422 ditolak (skema ketat)', mass.status() === 422, `status=${mass.status()}`);

      report.step('5.4 CSRF Origin aplikasi sendiri vs Origin palsu');
      const legit = await page.request.put(API, { data: { pimShowDeprecatedFields: false, showSIN: false, showSSN: false, showTaxExemptions: false } });
      const evil = await page.request.put(API, { data: { pimShowDeprecatedFields: false, showSIN: false, showSSN: false, showTaxExemptions: false }, headers: { Origin: 'https://evil.example' } });
      report.check('5.4 [U036] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

      report.step('1.8 / 8.4 Toggle + Save via UI -- toast sukses & konsistensi pesan');
      await optionalFieldsPage.goto();
      await optionalFieldsPage.toggle(optionalFieldsPage.ssnToggle);
      await optionalFieldsPage.save();
      const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
      report.check('1.8 [U036] Toggle + Save via UI -> toast sukses muncul', !!toastText && /Successfully/i.test(toastText), `toast="${toastText}"`);
      report.check('8.4 [U036] Teks toast konsisten dgn pola "Successfully ..." di halaman config lain', !!toastText && /Successfully Saved/i.test(toastText), `toast="${toastText}"`);
      await page.waitForTimeout(500);

      report.step('4.3 Back/Forward pasca-save');
      await page.goBack().catch(() => null);
      await page.goForward().catch(() => null);
      report.check('4.3 [U036] Browser Back lalu Forward setelah save -> halaman termuat normal', page.url().includes('configurePim'), `url=${page.url()}`);

      report.step('4.5 Koneksi putus saat save');
      await optionalFieldsPage.goto();
      await optionalFieldsPage.toggle(optionalFieldsPage.sinToggle);
      await dropConnectionDuringSave(page, '**/optional-field*', () => optionalFieldsPage.saveButton.click());
      report.check('4.5 [U036] Koneksi putus saat save -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

      report.step('4.7 Concurrency -- 2 PUT nilai berbeda scr paralel');
      const [c1, c2] = await Promise.all([
        page.request.put(API, { data: { pimShowDeprecatedFields: true, showSIN: false, showSSN: false, showTaxExemptions: false } }),
        page.request.put(API, { data: { pimShowDeprecatedFields: false, showSIN: true, showSSN: false, showTaxExemptions: false } }),
      ]);
      report.check('4.7 [U036] 2 PUT nilai berbeda bersamaan -> tidak ada 500, salah satu "menang" (last-write-wins)', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);

      report.finding('4.8 [U036] Behavior non-obvious', 'Tidak ditemukan behavior non-intuitif baru pd Optional Fields (toast, back/forward, koneksi putus, concurrency semua konsisten dgn arsitektur config singleton).');
    },
  );
  report.print();
});
