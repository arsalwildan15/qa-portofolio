/**
 * ================================================================================
 * TC-XMOD-04 — Verify Arabic (RTL), CJK And Accented Names Are Stored And Shown Unchanged (4 Modules)
 * Modul    : Lintas modul (Leave / Claim / Performance / Time)
 * Kategori : Positive (+) 1.1-C 1.1-R | Edge Case (!) 4.1 | API (A) 6.1 -- Internationalisation
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-XMOD-04-Verify-Unicode-RTL-Names-Round-Trip-4-Modules.spec.ts
 * Path     : tests/_global/cross-module/
 * ================================================================================
 *
 * TUJUAN:
 *   Nama berisi Arab (RTL), CJK, Latin beraksen & simbol BMP (★) dibuat di tiap modul (Leave
 *   Type, Claim Event, KPI, Time Customer) -> 200 dan GET mengembalikan string IDENTIK
 *   (tidak ada mojibake / "?" / normalisasi). Satu nama juga dicek tampil utuh di UI (daftar
 *   Claim Events & Time Customers). Confirmed live 15 Nov 2026. Catatan: emoji (karakter di
 *   luar BMP) TIDAK termasuk -- perilakunya diuji terpisah di TC-XMOD-05.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/cross-module/TC-XMOD-04-Verify-Unicode-RTL-Names-Round-Trip-4-Modules.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

type Target = { module: string; createPath: string; listPath: string; nameKey: string; body: (name: string) => Record<string, unknown> };

const TARGETS: Target[] = [
  { module: 'Leave', createPath: '/web/index.php/api/v2/leave/leave-types', listPath: '/web/index.php/api/v2/leave/leave-types?limit=0', nameKey: 'name', body: (n) => ({ name: n, situational: false }) },
  { module: 'Claim', createPath: '/web/index.php/api/v2/claim/events', listPath: '/web/index.php/api/v2/claim/events?limit=0', nameKey: 'name', body: (n) => ({ name: n, description: 'وصف 説明', status: true }) },
  { module: 'Performance', createPath: '/web/index.php/api/v2/performance/kpis', listPath: '/web/index.php/api/v2/performance/kpis?limit=0', nameKey: 'title', body: (n) => ({ title: n, jobTitleId: 9, minRating: 0, maxRating: 100, isDefault: false }) },
  { module: 'Time', createPath: '/web/index.php/api/v2/time/customers', listPath: '/web/index.php/api/v2/time/customers?limit=0', nameKey: 'name', body: (n) => ({ name: n, description: 'وصف 説明' }) },
];

test('TC-XMOD-04: Arabic, CJK and accented names round-trip unchanged in 4 modules', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-XMOD-04', 'Unicode RTL Names Round Trip 4 Modules', env.baseURL, page);
  const s = String(Date.now()).slice(-6);
  const names: Record<string, string> = {};

  for (const t of TARGETS) {
    // <= 50 chars: Leave Type name max length is 50 (51 -> 422, confirmed live).
    const name = `${t.module.slice(0, 3)} مرحبا 你好 Ñandú ★ ${s}`;
    names[t.module] = name;
    report.step(`[${t.module}] Buat "${name}" lalu baca kembali`);
    const r = await page.request.post(t.createPath, { data: t.body(name) });
    const created = (await r.json().catch(() => null))?.data?.[t.nameKey];
    report.check(`[${t.module}] Create 200, respons memuat nama identik`, r.status() === 200 && created === name, `status=${r.status()}, name=${created}`);
    const list = ((await (await page.request.get(t.listPath)).json().catch(() => null))?.data ?? []) as Array<Record<string, unknown>>;
    report.check(`[${t.module}] GET list mengembalikan nama identik`, list.some((x) => x[t.nameKey] === name));
  }

  report.step('[UI] Nama tampil utuh di daftar Claim Events & Time Customers');
  await page.goto('/web/index.php/claim/viewEvents');
  report.check('[Claim UI] Nama tampil utuh', await isVisibleWithWait(page.locator('.oxd-table-card').filter({ hasText: names['Claim']! }).first(), 15_000));
  await page.goto('/web/index.php/time/viewCustomers');
  report.check('[Time UI] Nama tampil utuh', await isVisibleWithWait(page.locator('.oxd-table-card').filter({ hasText: names['Time']! }).first(), 15_000));

  report.print();
});
