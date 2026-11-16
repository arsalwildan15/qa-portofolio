/**
 * ================================================================================
 * TC-DASHBOARD-WIDGET-02 — Verify The Seven Dashboard Widget APIs: Contract, Wrong Method, No Session, ESS Access, Headers And No Sensitive Data
 * Modul    : Dashboard > Widgets (U107) & Dashboard (U008)
 * Kategori : Security (S) 5.6 5.8 | API (A) 6.1 6.2 6.3 6.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-DASHBOARD-WIDGET-02-Verify-Widget-APIs-Contract-Methods-Auth-Role-Headers-And-No-Sensitive-Data.spec.ts
 * Path     : tests/dashboard/widgets/
 * ================================================================================
 *
 * TUJUAN (7 endpoint yg dipanggil halaman Dashboard, direkam LIVE 16 Nov 2026):
 *   6.1  GET (Admin) -> 200; parameter tanggal/jam tidak valid -> 422 dgn nama parameter.
 *   6.2  Kontrak: data (array/objek sesuai widget) + meta; field kunci per widget ada.
 *   6.3  PATCH & POST -> 405.
 *   6.4  Tanpa sesi -> 401 tanpa data; sesi ESS -> 403 utk grafik distribusi (widget Admin),
 *        200 utk widget yg memang tampil bagi ESS.
 *   5.6  Respons API membawa X-Content-Type-Options: nosniff, HSTS, CSP & Cache-Control
 *        no-cache/private (data karyawan tidak disimpan cache bersama).
 *   5.8  Tidak ada field password/hash/secret/token/salt di respons.
 *
 * RUN COMMAND:
 *   npx playwright test tests/dashboard/widgets/TC-DASHBOARD-WIDGET-02-Verify-Widget-APIs-Contract-Methods-Auth-Role-Headers-And-No-Sensitive-Data.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession } from '../../../src/utils/myInfo';
import { WIDGET_API } from '../../../src/utils/dashboardWidgets';

const API = '/web/index.php/api/v2/';
const today = new Date().toISOString().slice(0, 10);
const QUERY: Partial<Record<keyof typeof WIDGET_API, string>> = {
  timeAtWork: `?timezoneOffset=7&currentDate=${today}&currentTime=10:00`,
  leaveToday: `?date=${today}`,
  buzz: '?limit=5&offset=0&sortOrder=DESC&sortField=share.createdAtUtc',
};
/** Shape of `data` and the key fields each widget reads (from the live responses). */
const CONTRACT: Record<keyof typeof WIDGET_API, (d: unknown) => boolean> = {
  timeAtWork: (d) => Array.isArray(d) && d.length === 7 && d.every((x) => x?.workDay?.date && typeof x?.totalTime?.hours === 'number'),
  actions: (d) => Array.isArray(d) && d.every((x) => typeof x?.group === 'string' && typeof x?.pendingActionCount === 'number'),
  shortcuts: (d) => !!d && typeof d === 'object' && !Array.isArray(d) && Object.values(d as object).every((v) => typeof v === 'boolean'),
  buzz: (d) => Array.isArray(d),
  leaveToday: (d) => Array.isArray(d),
  bySubunit: (d) => Array.isArray(d) && d.every((x) => typeof x?.subunit?.name === 'string' && typeof x?.count === 'number'),
  byLocation: (d) => Array.isArray(d) && d.every((x) => typeof x?.location?.name === 'string' && typeof x?.count === 'number'),
};
const ADMIN_ONLY: Array<keyof typeof WIDGET_API> = ['bySubunit', 'byLocation'];
const SENSITIVE = /"(password|passwordHash|hash|secret|token|salt)"\s*:/i;

test('TC-DASHBOARD-WIDGET-02: widget APIs contract, methods, auth, role, headers and no sensitive data', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-DASHBOARD-WIDGET-02', 'Widget APIs Contract Methods Auth Role Headers', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaDashApi');

  try {
    for (const [key, ep] of Object.entries(WIDGET_API) as Array<[keyof typeof WIDGET_API, string]>) {
      const tag = `[${key}] ${ep}`;
      const url = API + ep + (QUERY[key] ?? '');
      report.step(tag);
      const r = await page.request.get(url);
      const text = await r.text();
      const body = JSON.parse(text || '{}') as { data?: unknown; meta?: unknown };
      report.check(`${tag} 6.1 GET (Admin) -> 200`, r.status() === 200, `status=${r.status()}`);
      report.check(`${tag} 6.2 Kontrak data + meta & field kunci widget`, CONTRACT[key](body.data) && body.meta !== undefined, text.slice(0, 120));
      report.check(`${tag} 5.8 Tanpa field sensitif di respons`, !SENSITIVE.test(text), SENSITIVE.exec(text)?.[0] ?? 'tidak ada');
      const h = r.headers();
      report.check(`${tag} 5.6 nosniff + HSTS + CSP pada respons API`, h['x-content-type-options'] === 'nosniff' && !!h['strict-transport-security'] && !!h['content-security-policy'], `nosniff=${h['x-content-type-options']}, hsts=${!!h['strict-transport-security']}, csp=${!!h['content-security-policy']}`);
      report.check(`${tag} 5.6 Cache-Control tidak mengizinkan cache bersama (no-cache/no-store/private)`, /no-cache|no-store|private/.test(h['cache-control'] ?? ''), `cache-control=${h['cache-control']}`);

      const [patch, post] = await Promise.all([page.request.patch(url, { data: {} }), page.request.post(url, { data: {} })]);
      report.check(`${tag} 6.3 PATCH & POST -> 405`, patch.status() === 405 && post.status() === 405, `PATCH=${patch.status()}, POST=${post.status()}`);

      const noAuth = await anon.get(url);
      const noAuthText = await noAuth.text();
      report.check(`${tag} 6.4 Tanpa sesi -> 401 tanpa data`, noAuth.status() === 401 && !/"data"\s*:\s*[[{]\s*["{]/.test(noAuthText), `status=${noAuth.status()}`);

      const ess = await essPage.request.get(url);
      const wantEss = ADMIN_ONLY.includes(key) ? 403 : 200;
      report.check(`${tag} 6.4 Sesi ESS -> ${wantEss}${wantEss === 403 ? ' (widget khusus Admin)' : ' (widget tampil bagi ESS)'}`, ess.status() === wantEss, `status=${ess.status()}`);
    }

    report.step('Parameter tidak valid');
    const badTaw = await page.request.get(`${API}${WIDGET_API.timeAtWork}?timezoneOffset=abc&currentDate=xx&currentTime=99:99`);
    const badTawBody = await badTaw.text();
    report.check('6.1 time-at-work dgn timezoneOffset/currentDate/currentTime tidak valid -> 422 menyebut ketiganya', badTaw.status() === 422 && ['timezoneOffset', 'currentDate', 'currentTime'].every((k) => badTawBody.includes(k)), `${badTaw.status()} ${badTawBody.slice(0, 140)}`);
    const badLeave = await page.request.get(`${API}${WIDGET_API.leaveToday}?date=notadate`);
    report.check('6.1 leaves?date=notadate -> 422 (bukan 500)', badLeave.status() === 422, `status=${badLeave.status()}`);
  } finally {
    await close();
    await anon.dispose();
  }
  report.print();
});
