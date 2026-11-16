/**
 * ================================================================================
 * TC-DASHBOARD-WIDGET-03 — Verify Dashboard Widgets With Empty Data, A Failing Widget API, Their Load Speed, Phone Layout, Other Browsers And Assistive Tech
 * Modul    : Dashboard > Widgets (U107) & Dashboard (U008)
 * Kategori : Edge (!) 4.6 4.8 | Non-Functional (7) 7.1 7.2 7.3 7.4 7.5 | UI (8) 8.1 8.2 8.3
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-DASHBOARD-WIDGET-03-Verify-Widgets-Empty-State-Error-Isolation-Speed-Layout-And-Accessibility.spec.ts
 * Path     : tests/dashboard/widgets/
 * ================================================================================
 *
 * TUJUAN:
 *   4.6  Semua widget API dijawab data kosong (route.fulfill; Time at Work = 7 hari dgn 0 jam, krn API
 *        tidak pernah mengirim array kosong) -> 7 widget tetap tampil, tanpa "NaN"/"undefined"/"null";
 *        teks empty state per widget dicatat (grafik distribusi kosong tidak menampilkan teks apa pun).
 *   4.6  Field yg biasanya terisi bernilai null (totalTime.hours/minutes = null) -> tanpa "NaN".
 *   4.8  Satu widget API gagal (500, tab terpisah) -> widget lain tetap tampil & berisi (isolasi);
 *        perilaku widget yg gagal (toast, uncaught exception) dicatat sbg known behaviour.
 *   7.5  Batas kewajaran (bukan SLA, konvensi TC-SWEEP-PAGE-01): Dashboard < 20 dtk, tiap widget API
 *        < 10 dtk; waktu nyata dicatat sbg finding.
 *   7.1-7.3  Tanpa console error/request gagal pada muatan normal (cek otomatis TestReport).
 *   7.4  Tanpa console warning dari aplikasi.
 *   8.1  Ponsel 375x812: tanpa scroll horizontal, setiap widget muat di lebar layar.
 *   8.2  Firefox & WebKit: login lalu 7 widget tampil.
 *   8.3  Tombol Quick Launch punya nama aksesibel (title); grafik distribusi punya legenda teks
 *        (alternatif tekstual canvas) -> canvas tanpa aria-label dicatat sbg finding.
 *
 * RUN COMMAND:
 *   npx playwright test tests/dashboard/widgets/TC-DASHBOARD-WIDGET-03-Verify-Widgets-Empty-State-Error-Isolation-Speed-Layout-And-Accessibility.spec.ts --project=chromium
 * ================================================================================
 */

import { firefox, webkit, type BrowserType, type Page } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { WIDGET_API, ADMIN_WIDGETS, SHORTCUT_LABEL, widget, widgetNames, apiPathOf } from '../../../src/utils/dashboardWidgets';

const DASH = '/web/index.php/dashboard/index';
const EMPTY: Record<keyof typeof WIDGET_API, unknown> = {
  // Time at Work always returns the 7 days of the week (never an empty array); "empty" for it means
  // nothing worked and no punch yet -- built from the live response in the route below.
  timeAtWork: null,
  actions: { data: [], meta: [], rels: [] },
  shortcuts: { data: Object.fromEntries(Object.keys(SHORTCUT_LABEL).map((k) => [k, false])), meta: [], rels: [] },
  buzz: { data: [], meta: { total: 0 }, rels: [] },
  leaveToday: { data: [], meta: { total: 0, leavePeriodDefined: true }, rels: [] },
  bySubunit: { data: [], meta: { otherEmployeeCount: 0, unassignedEmployeeCount: 0, totalSubunitCount: 0 }, rels: [] },
  byLocation: { data: [], meta: { otherEmployeeCount: 0, unassignedEmployeeCount: 0, totalLocationCount: 0 }, rels: [] },
};
const keyOf = (url: string) => (Object.entries(WIDGET_API).find(([, ep]) => apiPathOf(url).split('?')[0] === ep)?.[0] ?? null) as keyof typeof WIDGET_API | null;
const BAD_TEXT = /\bNaN\b|\bundefined\b|\bnull\b/;
const LOAD_SANITY_MS = 20_000;
const WIDGET_SANITY_MS = 10_000;

async function widgetTexts(page: Page) {
  const out: Record<string, string> = {};
  for (const n of await widgetNames(page)) out[n] = (await widget(page, n).innerText()).replace(/\s+/g, ' ').trim();
  return out;
}

test('TC-DASHBOARD-WIDGET-03: widgets empty state, error isolation, speed, layout, browsers and accessibility', async ({ page }, testInfo) => {
  testInfo.setTimeout(360_000);
  const report = new TestReport('TC-DASHBOARD-WIDGET-03', 'Widgets Empty Error Speed Layout Accessibility', env.baseURL, page);
  const warnings: string[] = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

  report.step('Muatan normal: kecepatan');
  const timings: string[] = [];
  const slow: string[] = [];
  page.on('requestfinished', (r) => {
    const k = keyOf(r.url());
    if (!k) return;
    const t = r.timing();
    const ms = t.responseEnd;
    timings.push(`${k}=${Math.round(ms)}ms`);
    if (ms > WIDGET_SANITY_MS) slow.push(`${k}=${Math.round(ms)}ms`);
  });
  const t0 = Date.now();
  await page.goto(DASH);
  await page.waitForLoadState('networkidle');
  const loadMs = Date.now() - t0;
  // Same convention as TC-SWEEP-PAGE-01: the shared demo's speed swings widely (widget calls 1-3.6 s
  // on 16 Nov), so only a sanity bound is hard-checked and the measured times are recorded.
  report.check(`7.5 Dashboard siap (networkidle) < ${LOAD_SANITY_MS / 1000} dtk (batas kewajaran, bukan SLA)`, loadMs < LOAD_SANITY_MS, `${loadMs} ms`);
  report.check(`7.5 Ketujuh widget API selesai, masing2 < ${WIDGET_SANITY_MS / 1000} dtk (batas kewajaran)`, timings.length >= 7 && slow.length === 0, `${timings.join(', ')}${slow.length ? ` | lambat: ${slow.join(', ')}` : ''}`);
  report.finding('7.5 Waktu muat Dashboard', `${loadMs} ms; ${timings.join(', ')}`);

  report.step('Aksesibilitas');
  const qlButtons = widget(page, 'Quick Launch').locator('.orangehrm-quick-launch-card button');
  const qlNames = await qlButtons.evaluateAll((bs) => bs.map((b) => b.getAttribute('title') || b.getAttribute('aria-label') || (b.textContent ?? '').trim()));
  report.check('8.3 Setiap tombol Quick Launch punya nama aksesibel', qlNames.length > 0 && qlNames.every(Boolean), qlNames.join(', '));
  for (const chart of ['Employee Distribution by Sub Unit', 'Employee Distribution by Location']) {
    const legend = await widget(page, chart).locator('li, .oxd-chart-legend').allInnerTexts();
    report.check(`8.3 ${chart}: legenda teks tersedia sbg alternatif canvas`, legend.join('').trim().length > 0, legend.join(' | ').slice(0, 100));
    const canvasLabel = await widget(page, chart).locator('canvas').first().evaluate((c) => c.getAttribute('aria-label') || c.getAttribute('role') || '');
    if (!canvasLabel) report.finding(`8.3 ${chart}`, 'canvas grafik tanpa aria-label/role; isi hanya terbaca lewat legenda teks');
  }

  report.step('4.6 Semua widget API kosong');
  await page.route('**/api/v2/**', async (route) => {
    const k = keyOf(route.request().url());
    if (k === 'timeAtWork') {
      const res = await route.fetch();
      const body = await res.json();
      for (const d of body.data ?? []) d.totalTime = { hours: 0, minutes: 0 };
      if (body.meta?.lastAction) body.meta.lastAction = { state: null, utcDate: null, utcTime: null, userDate: null, userTime: null, timezoneOffset: null };
      if (body.meta?.currentDay) body.meta.currentDay.totalTime = { hours: 0, minutes: 0 };
      return route.fulfill({ response: res, json: body });
    }
    if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY[k]) });
    return route.continue();
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  const emptyNames = await widgetNames(page);
  const emptyTexts = await widgetTexts(page);
  report.check('4.6 Data kosong -> 7 widget tetap tampil', JSON.stringify(emptyNames) === JSON.stringify(ADMIN_WIDGETS), emptyNames.join(', '));
  const bad = Object.entries(emptyTexts).filter(([, t]) => BAD_TEXT.test(t));
  report.check('4.6 Data kosong -> tanpa "NaN"/"undefined"/"null" di widget', bad.length === 0, bad.map(([n, t]) => `${n}: ${t.slice(0, 60)}`).join(' | ') || 'bersih');
  report.finding('4.6 Teks empty state per widget', Object.entries(emptyTexts).map(([n, t]) => `${n} -> "${t.replace(n, '').trim().slice(0, 50)}"`).join(' | '));
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  report.step('4.6 Field bernilai null');
  await page.route('**/api/v2/dashboard/employees/time-at-work*', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    for (const d of body.data ?? []) d.totalTime = { hours: null, minutes: null };
    if (body.meta?.currentDay?.totalTime) body.meta.currentDay.totalTime = { hours: null, minutes: null };
    return route.fulfill({ response: res, json: body });
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  const tawNull = (await widget(page, 'Time at Work').innerText()).replace(/\s+/g, ' ');
  report.check('4.6 totalTime null -> Time at Work tanpa "NaN"/"undefined"', !/\bNaN\b|\bundefined\b/.test(tawNull), tawNull.slice(0, 120));
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  report.step('4.8 Satu widget API gagal (di tab terpisah)');
  // The injected 500 makes the browser log errors on purpose; it runs in its own tab so they do not
  // count against the automatic console check of the normal page load (7.1-7.3).
  const iso = await page.context().newPage();
  const isoErrors: string[] = [];
  iso.on('pageerror', (e) => isoErrors.push(`${e.name}: ${e.message}`));
  await iso.route('**/api/v2/dashboard/employees/locations*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"status":"500","message":"Unexpected Error Occurred"}}' }));
  await iso.goto(DASH);
  await iso.waitForLoadState('networkidle');
  const isoTexts = await widgetTexts(iso);
  const others = ADMIN_WIDGETS.filter((n) => n !== 'Employee Distribution by Location');
  const othersOk = others.every((n) => (isoTexts[n] ?? '').length > n.length);
  report.check('4.8 Widget Location gagal (500) -> 6 widget lain tetap tampil & berisi', othersOk, others.filter((n) => !((isoTexts[n] ?? '').length > n.length)).join(', ') || 'semua berisi');
  const toast = await iso.locator('.oxd-toast').allInnerTexts();
  report.finding('4.8 Perilaku widget yg API-nya gagal', `widget: "${(isoTexts['Employee Distribution by Location'] ?? '(tidak tampil)').slice(0, 60)}"; toast: ${toast.join(' | ').replace(/\s+/g, ' ') || '(tidak ada)'}; uncaught exception di browser: ${isoErrors.join(' | ') || 'tidak ada'}`);
  await iso.close();

  report.step('8.1 Layar ponsel');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await page.waitForLoadState('networkidle');
  const layout = await page.evaluate(() => {
    const vw = window.innerWidth;
    const wide = Array.from(document.querySelectorAll('.orangehrm-dashboard-widget')).filter((w) => w.getBoundingClientRect().right > vw + 1).length;
    return { scroll: document.documentElement.scrollWidth, vw, wide };
  });
  report.check('8.1 Ponsel 375px: tanpa scroll horizontal & setiap widget muat di layar', layout.scroll <= layout.vw + 2 && layout.wide === 0, `scrollWidth=${layout.scroll}, lebar=${layout.vw}, widgetMeluber=${layout.wide}`);
  await page.setViewportSize({ width: 1280, height: 720 });

  const appWarnings = warnings.filter((w) => !/DevTools|third-party|Download the Vue/i.test(w));
  report.check('7.4 Tanpa console warning dari aplikasi', appWarnings.length === 0, appWarnings.slice(0, 3).join(' | ') || 'tidak ada');

  for (const [name, engine] of [['firefox', firefox], ['webkit', webkit]] as Array<[string, BrowserType]>) {
    report.step(`8.2 ${name}`);
    const b = await engine.launch();
    try {
      const p = await (await b.newContext({ baseURL: env.baseURL })).newPage();
      await p.goto('/web/index.php/auth/login', { timeout: 90_000 });
      await p.getByPlaceholder('Username').fill(env.username);
      await p.getByPlaceholder('Password').fill(env.password);
      await p.getByRole('button', { name: 'Login' }).click();
      await p.waitForURL(/dashboard/, { timeout: 60_000 });
      await p.waitForLoadState('networkidle');
      const names = await widgetNames(p);
      report.check(`8.2 ${name}: 7 widget tampil`, JSON.stringify(names) === JSON.stringify(ADMIN_WIDGETS), names.join(', '));
    } finally {
      await b.close();
    }
  }
  report.print();
});
