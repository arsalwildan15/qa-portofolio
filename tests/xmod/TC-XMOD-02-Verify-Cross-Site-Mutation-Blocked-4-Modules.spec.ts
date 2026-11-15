/**
 * ================================================================================
 * TC-XMOD-02 — Verify A Cross-Site Page Cannot Create Data In Leave, Claim, Performance Or Time (CSRF)
 * Modul    : Lintas modul (Leave / Claim / Performance / Time) - Security
 * Kategori : Security (S) / CSRF
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-XMOD-02-Verify-Cross-Site-Mutation-Blocked-4-Modules.spec.ts
 * Path     : tests/xmod/
 * ================================================================================
 *
 * TUJUAN:
 *   Dari halaman penyerang (https://example.com, tab di browser yg sama dgn sesi Admin), coba
 *   membuat data di endpoint "create" tiap modul dengan DUA cara:
 *     (a) fetch JSON + credentials:'include' -> butuh preflight CORS;
 *     (b) "simple request" form-urlencoded, mode:'no-cors' -> TANPA preflight (vektor CSRF
 *         klasik; satu-satunya penghalang adalah cookie SameSite).
 *   Lalu Admin mengecek via API bahwa TIDAK ada data yg terbentuk.
 *   Confirmed live 15 Nov 2026: (a) diblokir CORS; (b) terkirim (opaque) tapi tidak membuat
 *   data karena cookie sesi "orangehrm" SameSite=Lax tidak ikut di POST lintas-situs.
 *   FINDING (bukan bug): server sendiri MENERIMA body form-urlencoded dan TIDAK memeriksa
 *   Origin (POST langsung dgn Origin evil + cookie -> 200) dan tidak memakai token CSRF --
 *   perlindungan bergantung penuh pada SameSite=Lax + CORS.
 *
 * RUN COMMAND:
 *   npx playwright test tests/xmod/TC-XMOD-02-Verify-Cross-Site-Mutation-Blocked-4-Modules.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

type Target = { module: string; createPath: string; listPath: string; nameKey: string; json: (name: string) => Record<string, unknown>; form: (name: string) => string };

const TARGETS: Target[] = [
  { module: 'Leave', createPath: '/web/index.php/api/v2/leave/leave-types', listPath: '/web/index.php/api/v2/leave/leave-types?limit=0', nameKey: 'name',
    json: (n) => ({ name: n, situational: false }), form: (n) => `name=${encodeURIComponent(n)}&situational=false` },
  { module: 'Claim', createPath: '/web/index.php/api/v2/claim/events', listPath: '/web/index.php/api/v2/claim/events?limit=0', nameKey: 'name',
    json: (n) => ({ name: n, status: true }), form: (n) => `name=${encodeURIComponent(n)}&status=true` },
  { module: 'Performance', createPath: '/web/index.php/api/v2/performance/kpis', listPath: '/web/index.php/api/v2/performance/kpis?limit=0', nameKey: 'title',
    json: (n) => ({ title: n, jobTitleId: 9, minRating: 0, maxRating: 100, isDefault: false }), form: (n) => `title=${encodeURIComponent(n)}&jobTitleId=9&minRating=0&maxRating=100` },
  { module: 'Time', createPath: '/web/index.php/api/v2/time/customers', listPath: '/web/index.php/api/v2/time/customers?limit=0', nameKey: 'name',
    json: (n) => ({ name: n, description: '' }), form: (n) => `name=${encodeURIComponent(n)}&description=` },
];

test('TC-XMOD-02: a cross-site page cannot create data in Leave, Claim, Performance or Time', async ({ page, context }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-XMOD-02', 'Cross-Site Mutation Blocked 4 Modules', env.baseURL, page);
  const stamp = Date.now();

  report.step('Sesi Admin aktif; cookie sesi SameSite');
  const session = (await context.cookies()).find((c) => c.name === 'orangehrm');
  report.check('Cookie sesi "orangehrm" ada', !!session);
  report.finding('Atribut cookie sesi', `sameSite=${session?.sameSite}, httpOnly=${session?.httpOnly}, secure=${session?.secure}`);

  report.step('Buka halaman penyerang (https://example.com) di browser yg sama');
  const attacker = await context.newPage();
  await attacker.goto('https://example.com');

  for (const t of TARGETS) {
    report.step(`[${t.module}] Penyerang: (a) fetch JSON + credentials, (b) form simple POST no-cors`);
    const jsonName = `QaCsrfJson${t.module} ${stamp}`;
    const formName = `QaCsrfForm${t.module} ${stamp}`;
    const result = await attacker.evaluate(async ({ url, jsonBody, formBody }) => {
      const out: { json: string; form: string } = { json: '', form: '' };
      try {
        const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jsonBody) });
        out.json = `sent:${r.status}`;
      } catch (e) { out.json = `blocked:${String(e).slice(0, 40)}`; }
      try {
        const r = await fetch(url, { method: 'POST', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody });
        out.form = `sent:${r.type}`;
      } catch (e) { out.form = `blocked:${String(e).slice(0, 40)}`; }
      return out;
    }, { url: `${env.baseURL}${t.createPath}`, jsonBody: t.json(jsonName), formBody: t.form(formName) });
    report.check(`[${t.module}] (a) fetch JSON lintas-origin diblokir CORS`, result.json.startsWith('blocked'), result.json);

    const list = ((await (await page.request.get(t.listPath)).json().catch(() => null))?.data ?? []) as Array<Record<string, unknown>>;
    report.check(`[${t.module}] Tidak ada data dari (a) JSON`, !list.some((x) => x[t.nameKey] === jsonName));
    report.check(`[${t.module}] Tidak ada data dari (b) form simple POST`, !list.some((x) => x[t.nameKey] === formName), `form=${result.form}`);
  }
  await attacker.close();

  report.step('[Finding] Server sendiri: POST form-urlencoded dgn Origin asing + cookie sesi');
  const direct = await page.request.post('/web/index.php/api/v2/time/customers', {
    form: { name: `QaCsrfDirect ${stamp}`, description: '' },
    headers: { Origin: 'https://evil.example', Referer: 'https://evil.example/' },
  });
  report.finding('Server tidak memeriksa Origin & menerima form-urlencoded (tanpa token CSRF)', `status=${direct.status()} -- perlindungan bergantung pada SameSite=Lax + CORS di browser`);

  report.print();
});
