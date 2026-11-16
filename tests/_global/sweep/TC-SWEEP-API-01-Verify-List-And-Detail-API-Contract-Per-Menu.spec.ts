/**
 * ================================================================================
 * TC-SWEEP-API-01 — Verify Each Menu's List/Detail API: Contract, Auth, Method, Paging, Sensitive Data, Unknown Id
 * Modul    : Semua menu ber-API list (registry src/data/unitApiRegistry.ts, inventaris API LIVE)
 * Kategori : API (A) 6.1 6.2 6.3 6.4 6.6 | Security (S) 5.8 | Negative (-) 2.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-API-01-Verify-List-And-Detail-API-Contract-Per-Menu.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN:
 *   Endpoint per unit diambil dari request yg BENAR-BENAR dikirim halaman menu tsb
 *   (tools/coverage/api-discovery.json). Per unit (label [U###]):
 *     6.1/6.2  GET list (sesi Admin) -> 200, body {data: [], meta: {total: number}}.
 *     6.4      GET list TANPA sesi (request context tanpa cookie) -> 401, tanpa data.
 *     6.3      PATCH ke endpoint list (method tak didukung) -> 405.
 *     6.6      (bila halaman memakai paging) limit=-1, limit=abc, offset=-5 -> 422;
 *              (bila memakai sort) sortOrder=SIDEWAYS, sortField=xyz -> 422.
 *     5.8      respons list tidak membawa field bernama password/hash/secret/token/salt.
 *     2.6      (bila ada pola detail) KONTROL: GET detail dgn id nyata dari list -> 200; lalu
 *              id 999999 -> 404/422 (bukan 2xx, bukan 5xx). Bila kontrol gagal, pola detail
 *              dicatat "tidak valid" (finding) -- tidak dihitung lolos maupun gagal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-API-01-Verify-List-And-Detail-API-Contract-Per-Menu.spec.ts --project=chromium
 * ================================================================================
 */

import { request as pwRequest } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { API_UNITS, withParam } from '../../../src/data/unitApiRegistry';

const API = '/web/index.php/api/v2/';
const SENSITIVE_KEY = /password|passwd|hash|secret|token|salt/i;

function sensitiveKeys(value: unknown, path = '', found: string[] = []): string[] {
  if (Array.isArray(value)) value.slice(0, 5).forEach((v, i) => sensitiveKeys(v, `${path}[${i}]`, found));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) found.push(`${path}.${k}`);
      sensitiveKeys(v, `${path}.${k}`, found);
    }
  }
  return found;
}

test('TC-SWEEP-API-01: list/detail API contract, auth, method, paging, sensitive data and unknown id per menu', async ({ page }, testInfo) => {
  testInfo.setTimeout(API_UNITS.length * 30_000);
  const report = new TestReport('TC-SWEEP-API-01', 'List And Detail API Contract Per Menu', env.baseURL);
  const anon = await pwRequest.newContext({ baseURL: env.baseURL });

  for (const u of API_UNITS) {
    const tag = `[${u.id} ${u.path}]`;
    report.step(`${tag} ${u.list}`);

    const ok = await page.request.get(API + u.list);
    const body = await ok.json().catch(() => null);
    const rows = Array.isArray(body?.data) ? (body.data as Array<Record<string, unknown>>) : null;
    report.check(`${tag} 1.1-R / 6.1 GET list (Admin) -> 200`, ok.status() === 200, `status=${ok.status()}`);
    report.check(`${tag} 6.2 Kontrak list: data[] + meta.total angka`, !!rows && typeof body?.meta?.total === 'number', `data=${Array.isArray(body?.data)}, meta.total=${JSON.stringify(body?.meta?.total)}`);

    const noAuth = await anon.get(API + u.list);
    const noAuthBody = await noAuth.text();
    report.check(`${tag} 6.4 Tanpa sesi -> 401, tanpa data`, noAuth.status() === 401 && !/"data"\s*:\s*\[\s*\{/.test(noAuthBody), `status=${noAuth.status()}`);

    const patch = await page.request.patch(API + u.list.split('?')[0], { data: {} });
    report.check(`${tag} 6.3 Method tak didukung (PATCH) -> 405`, patch.status() === 405, `status=${patch.status()}`);

    if (u.paged) {
      for (const [k, v] of [['limit', '-1'], ['limit', 'abc'], ['offset', '-5']] as const) {
        const r = await page.request.get(API + withParam(u.list, k, v));
        report.check(`${tag} 6.6 ${k}=${v} -> 422`, r.status() === 422, `status=${r.status()}`);
      }
    }
    if (u.sorted) {
      for (const [k, v] of [['sortOrder', 'SIDEWAYS'], ['sortField', 'xyz']] as const) {
        const r = await page.request.get(API + withParam(u.list, k, v));
        report.check(`${tag} 6.6 ${k}=${v} -> 422`, r.status() === 422, `status=${r.status()}`);
      }
    }

    const leaked = sensitiveKeys(body?.data ?? null);
    report.check(`${tag} 5.8 Tidak ada field sensitif (password/hash/secret/token/salt) di respons`, leaked.length === 0, leaked.slice(0, 4).join(', '));

    if (u.detail) {
      const realId = rows?.[0]?.['id'] ?? rows?.[0]?.['empNumber'];
      if (realId === undefined || realId === null) {
        report.finding(`${tag} 2.6 dilewati`, 'list kosong -> tidak ada id nyata utk kontrol');
      } else {
        const control = await page.request.get(API + u.detail.replace('{id}', String(realId)));
        if (control.status() !== 200) {
          report.finding(`${tag} 2.6 pola detail tidak valid`, `${u.detail} dgn id nyata ${realId} -> ${control.status()} (tidak diuji)`);
        } else {
          const missing = await page.request.get(API + u.detail.replace('{id}', '999999'));
          report.check(`${tag} 2.6 id tak eksis -> 404/422 (bukan 2xx/5xx)`, [404, 422].includes(missing.status()), `status=${missing.status()}`);
        }
      }
    }
  }

  await anon.dispose();
  report.print();
});
