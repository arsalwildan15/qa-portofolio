/**
 * ================================================================================
 * TC-PIM-CUSTOMFIELD-07 — Verify Custom Fields: Feedback, Double Submit, Navigation, Concurrency, Rate Limit And CSRF
 * Modul    : PIM > Configuration > Custom Fields (U037)
 * Kategori : Positive (+) 1.8 | Edge (!) 4.2 4.3 4.5 4.7 4.8 | Security (S) 5.4 5.5 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CUSTOMFIELD-07-Verify-Feedback-Double-Submit-Navigation-Concurrency-Rate-Limit-And-CSRF.spec.ts
 * Path     : tests/pim/configuration/custom-fields/
 * ================================================================================
 *
 * LATAR: demo publik membatasi jumlah custom field per Screen (dibuktikan live: 400 setelah
 * ~10 field aktif ada di satu Screen) -- setiap langkah di TC ini membersihkan field yg baru
 * dibuatnya sendiri SEBELUM lanjut ke langkah berikutnya, supaya tidak menabrak batas itu.
 *
 * TUJUAN (dibuktikan via probe LIVE 18 Nov 2026):
 *   1.8 / 8.4  Add custom field valid via UI -> toast "Successfully Saved" muncul.
 *   4.3  Browser Back lalu Forward setelah Save -> halaman termuat normal (mendarat di route
 *        form /pim/saveCustomFields, bukan error/blank/login).
 *   4.2  Double-click Save pd form Add -> DITEMUKAN BUG (lihat HASIL).
 *   4.5  Koneksi putus saat save (POST di-abort) -> tetap di form, tidak crash.
 *   4.7  2 create custom field BERBEDA scr paralel -> tidak ada 500.
 *   5.5  3 create paralel (nama berbeda) -> SEMUA 200, tidak ada rate limit (finding, bukan
 *        bug, sesuai R4).
 *   5.4  Origin aplikasi sendiri vs Origin palsu -> status identik (konsisten TC-PIM-CSRF-01).
 *
 * HASIL 18 Nov 2026: SENGAJA FAILED (R3), BUG BARU BG-481 (Medium) -- double-click Save pd
 *   form Add Custom Field membuat 2 ENTRI dari 1 submit (tombol Save tidak dikunci selama
 *   request berjalan), instans ke-5 dari pola double-submit app-wide yg SAMA dgn BG-427
 *   (Locations/Reporting Methods/KPIs), BG-475 (Attachments).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/custom-fields/TC-PIM-CUSTOMFIELD-07-Verify-Feedback-Double-Submit-Navigation-Concurrency-Rate-Limit-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { dropConnectionDuringSave } from '../../../../src/utils/networkEdge';

const api = '/web/index.php/api/v2/pim/custom-fields';
const body = (fieldName: string, over: Record<string, unknown> = {}) => ({ fieldName, screen: 'personal', fieldType: 0, extraData: null, ...over });

test('TC-PIM-CUSTOMFIELD-07: feedback, double submit, navigation, concurrency, rate limit, CSRF', async ({
  page, customFieldsPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PIM-CUSTOMFIELD-07', 'Custom Fields Feedback Double Submit Navigation Concurrency Rate Limit CSRF', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/,
  ]);
  const s = Date.now() % 100000;
  const createdIds: number[] = [];
  const addViaUi = async (name: string) => {
    await customFieldsPage.goto();
    await customFieldsPage.addButton.waitFor({ state: 'visible', timeout: 30_000 });
    await customFieldsPage.addButton.click();
    await customFieldsPage.fieldNameInput.waitFor({ state: 'visible' });
    await customFieldsPage.fieldNameInput.fill(name);
    await customFieldsPage.selectDropdownOption(customFieldsPage.screenSelect, 'Personal Details');
    await customFieldsPage.selectDropdownOption(customFieldsPage.typeSelect, 'Text or Number');
  };
  const purgeQa = async () => {
    const list = ((await (await page.request.get(`${api}?limit=50`)).json()) as { data: Array<{ id: number; fieldName: string }> }).data;
    const ids = list.filter((f) => f.fieldName.startsWith('Qa')).map((f) => f.id);
    if (ids.length) await page.request.delete(api, { data: { ids } }).catch(() => null);
  };

  try {
    report.step('1.8 / 8.4 Add custom field valid via UI -- toast sukses');
    await addViaUi(`QaCfUi${s}`);
    const [saved] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/custom-fields') && r.request().method() === 'POST'),
      customFieldsPage.save(),
    ]);
    const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
    report.check('1.8 [U037] Add valid via UI -> POST 200 + toast sukses muncul', saved.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${saved.status()} toast=${toastText}`);
    report.check('8.4 [U037] Teks toast konsisten dgn pola "Successfully ..." di halaman config lain', !!toastText && /Successfully Saved/i.test(toastText), `toast="${toastText}"`);

    report.step('4.3 Back/Forward pasca-save');
    await page.goBack().catch(() => null);
    await page.goForward().catch(() => null);
    report.check('4.3 [U037] Browser Back lalu Forward setelah save -> halaman termuat normal (tidak error/blank/login)', /saveCustomFields|listCustomFields/.test(page.url()), `url=${page.url()}`);
    await purgeQa();

    report.step('4.5 Koneksi putus saat save');
    await addViaUi(`QaCfDrop${s}`);
    await dropConnectionDuringSave(page, '**/custom-fields*', () => customFieldsPage.saveButton.click());
    report.check('4.5 [U037] Koneksi putus saat save -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');
    await purgeQa();

    report.step('4.2 Double-click Save pd form Add');
    await addViaUi(`QaCfDbl${s}`);
    const [dbl] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/custom-fields') && r.request().method() === 'POST').catch(() => null),
      customFieldsPage.saveButton.click({ clickCount: 2 }).catch(() => null),
    ]);
    await page.waitForTimeout(1500);
    const list = ((await (await page.request.get(`${api}?limit=50`)).json()) as { data: Array<{ id: number; fieldName: string }> }).data;
    const dblMatches = list.filter((f) => f.fieldName === `QaCfDbl${s}`);
    for (const m of dblMatches) createdIds.push(m.id);
    report.check('4.2 [U037] Double-click Save -> TIDAK ada 2 entri dari 1 submit', dblMatches.length <= 1, `status=${dbl?.status()} entriTersimpan=${dblMatches.length}`);
    if (createdIds.length) { await page.request.delete(api, { data: { ids: [...createdIds] } }).catch(() => null); createdIds.length = 0; }

    report.step('4.7 Concurrency -- 2 create custom field berbeda scr paralel');
    const [c1, c2] = await Promise.all([
      page.request.post(api, { data: body(`QaCfConcA${s}`) }),
      page.request.post(api, { data: body(`QaCfConcB${s}`) }),
    ]);
    report.check('4.7 [U037] 2 create berbeda bersamaan -> tidak ada 500', c1.status() < 500 && c2.status() < 500, `status1=${c1.status()} status2=${c2.status()}`);
    await purgeQa();

    report.step('5.5 Rate limiting -- 3 create paralel');
    const rapid = await Promise.all(Array.from({ length: 3 }, (_, i) => page.request.post(api, { data: body(`QaCfRapid${i}_${s}`) })));
    report.check('5.5 [U037] 3 create paralel -> SEMUA 200 (tidak ada 429/lockout)', rapid.every((r) => r.status() === 200), `statuses=${rapid.map((r) => r.status()).join(',')}`);
    report.finding('Rate limiting pada create custom field', '3 request create paralel SEMUA diterima (200) -- tidak ada rate limit pd endpoint ini, dicatat sbg finding (bukan bug) sesuai R4.');
    await purgeQa();

    report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
    const legit = await page.request.post(api, { data: body(`QaCfCsrfA${s}`) });
    const evil = await page.request.post(api, { data: body(`QaCfCsrfB${s}`), headers: { Origin: 'https://evil.example' } });
    report.check('5.4 [U037] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

    report.finding('4.8 [U037] Behavior non-obvious', 'Demo publik membatasi jumlah custom field per Screen (~10 aktif sekaligus, dikonfirmasi live via 400) -- bukan bug, dicatat sbg known behavior supaya sesi berikutnya tidak salah tafsir sbg validasi error.');
  } finally {
    await purgeQa();
  }
  report.print();
});
