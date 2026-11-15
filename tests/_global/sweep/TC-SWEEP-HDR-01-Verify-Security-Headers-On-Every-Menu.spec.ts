/**
 * ================================================================================
 * TC-SWEEP-HDR-01 — Verify Security Response Headers On Every Menu Page
 * Modul    : Semua menu (registry src/data/unitRegistry.ts)
 * Kategori : Security (S) 5.6 Security Headers (+ 5.8 info disclosure sbg finding)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-HDR-01-Verify-Security-Headers-On-Every-Menu.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN:
 *   Per unit menu (label [U###]), GET halaman dgn sesi Admin lalu periksa header respons:
 *     - Clickjacking: X-Frame-Options ATAU CSP frame-ancestors (taksonomi 5.6: WAJIB ada di
 *       halaman sensitif). Gap ini SUDAH tercatat per modul (BG-030/066/096/145/175/404);
 *       sweep ini mengonfirmasi cakupannya di SEMUA menu -> check sengaja tetap FAILED (R3).
 *     - X-Content-Type-Options: nosniff, Strict-Transport-Security, Content-Security-Policy
 *       (taksonomi: cek ada/tidak).
 *     - Referrer-Policy & banner header "Server" (versi web server) DICATAT sbg finding.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-HDR-01-Verify-Security-Headers-On-Every-Menu.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { PAGE_UNITS, resolveUnitUrl } from '../../../src/data/unitRegistry';

test('TC-SWEEP-HDR-01: every menu page sends the expected security headers', async ({ page }, testInfo) => {
  testInfo.setTimeout(PAGE_UNITS.length * 15_000);
  const report = new TestReport('TC-SWEEP-HDR-01', 'Security Headers On Every Menu', env.baseURL);
  const servers = new Set<string>();

  for (const unit of PAGE_UNITS) {
    const tag = `[${unit.id} ${unit.path}]`;
    const url = await resolveUnitUrl(page, unit);
    if (!url) { report.finding(`${tag} dilewati`, 'tidak ada record live utk URL detail'); continue; }
    const h = (await page.request.get(url)).headers();
    const csp = h['content-security-policy'] ?? '';
    report.check(`${tag} 5.6 Proteksi clickjacking (X-Frame-Options / frame-ancestors)`, h['x-frame-options'] !== undefined || /frame-ancestors/i.test(csp), `x-frame-options=${h['x-frame-options'] ?? '(tidak ada)'}`);
    report.check(`${tag} 5.6 X-Content-Type-Options: nosniff`, h['x-content-type-options'] === 'nosniff', `value=${h['x-content-type-options']}`);
    report.check(`${tag} 5.6 Strict-Transport-Security ada`, !!h['strict-transport-security'], `value=${h['strict-transport-security']}`);
    report.check(`${tag} 5.6 Content-Security-Policy ada`, csp.length > 0, `len=${csp.length}`);
    if (!h['referrer-policy']) report.finding(`${tag} 5.6 Referrer-Policy`, 'tidak dikirim');
    if (h['server']) servers.add(h['server']);
  }
  report.finding('5.8 Banner header "Server" (versi web server terekspos)', [...servers].join(', ') || '(tidak ada)');

  report.print();
});
