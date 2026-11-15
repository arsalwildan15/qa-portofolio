/**
 * ================================================================================
 * TC-SWEEP-PAGE-01 — Verify Every Menu Page Loads Cleanly For The Admin Role
 * Modul    : Semua menu (registry src/data/unitRegistry.ts, inventaris LIVE)
 * Kategori : Positive (+) 1.5 / Console & Browser-Level 7.1, 7.2, 7.3, 7.4, 7.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-PAGE-01-Verify-Every-Menu-Loads-Cleanly-For-Admin.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN:
 *   TC data-driven: SATU kunjungan per unit menu (semua unit yang punya URL; unit dialog/link
 *   eksternal punya TC sendiri) sebagai Admin. Per unit, setiap check diberi label [U###]
 *   sehingga bisa ditelusuri ke sel docs/Taxonomy-Coverage-Matrix.xlsx:
 *     1.5  halaman termuat utk role yg berhak (tidak dilempar ke login / "Credential Required",
 *          area konten berisi)
 *     7.1  tidak ada console error / uncaught exception selama halaman dimuat
 *     7.2  tidak ada request XHR/fetch yg gagal (4xx/5xx) selama halaman dimuat
 *     7.3  tidak ada aset (script/style/gambar/font) yg 404
 *     7.4  warning console DICATAT sbg finding (bukan hard-fail, sesuai taksonomi)
 *     7.5  waktu muat dicatat sbg finding; hard-check hanya batas kewajaran 20 dtk (tanpa SLA)
 *   Halaman Maintenance meminta konfirmasi password Admin -> diisi otomatis (alur resmi).
 *   Error yg sudah tercatat sbg bug di TC lain tetap gagal di sini (R3: tidak di-whitelist).
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-PAGE-01-Verify-Every-Menu-Loads-Cleanly-For-Admin.spec.ts --project=chromium
 * ================================================================================
 */

import { type Page, type Request, type Response } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { PAGE_UNITS, resolveUnitUrl } from '../../../src/data/unitRegistry';

const LOAD_SANITY_MS = 20_000;

/** Confirms the "Administrator Access" password prompt that guards Maintenance pages. */
async function passAdminAccessGate(page: Page): Promise<void> {
  const prompt = page.getByText('Administrator Access');
  if (await prompt.isVisible().catch(() => false)) {
    await page.locator('input[type="password"]').fill(env.password);
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }
}

test('TC-SWEEP-PAGE-01: every menu page loads cleanly for the Admin role', async ({ page }, testInfo) => {
  testInfo.setTimeout(PAGE_UNITS.length * 30_000);
  const report = new TestReport('TC-SWEEP-PAGE-01', 'Every Menu Loads Cleanly For Admin', env.baseURL);

  let consoleErrors: string[] = [];
  let warnings: string[] = [];
  let failedXhr: string[] = [];
  let missingAssets: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
    if (m.type() === 'warning') warnings.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`Uncaught exception: ${e.message}`));
  page.on('response', (r: Response) => {
    const type = r.request().resourceType();
    if (r.status() >= 400 && (type === 'xhr' || type === 'fetch')) failedXhr.push(`${r.status()} ${r.request().method()} ${r.url().split('/web/index.php')[1] ?? r.url()}`);
    if (r.status() === 404 && ['script', 'stylesheet', 'image', 'font'].includes(type)) missingAssets.push(r.url());
  });
  page.on('requestfailed', (r: Request) => {
    if (['script', 'stylesheet', 'image', 'font'].includes(r.resourceType())) missingAssets.push(`${r.url()} (${r.failure()?.errorText})`);
  });

  for (const unit of PAGE_UNITS) {
    const tag = `[${unit.id} ${unit.path}]`;
    const url = await resolveUnitUrl(page, unit);
    if (!url) {
      report.finding(`${tag} dilewati`, 'tidak ada record live utk membangun URL detail (data demo kosong saat run)');
      continue;
    }
    report.step(`${tag} ${url}`);
    consoleErrors = []; warnings = []; failedXhr = []; missingAssets = [];
    const started = Date.now();
    await page.goto(url).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await passAdminAccessGate(page);
    const elapsed = Date.now() - started;

    const onLogin = page.url().includes('/auth/login');
    const denied = await page.getByText('Credential Required').isVisible().catch(() => false);
    const contentChars = ((await page.locator('.oxd-layout-context').innerText().catch(() => '')) || '').trim().length;
    report.check(`${tag} 1.5 Halaman termuat utk Admin (bukan login/denied, konten ada)`, !onLogin && !denied && contentChars > 0, `url=${page.url().split('/web/index.php')[1]}, contentChars=${contentChars}`);
    report.check(`${tag} 7.1 Tidak ada console error / uncaught exception`, consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    report.check(`${tag} 7.2 Tidak ada XHR/fetch gagal (4xx/5xx)`, failedXhr.length === 0, failedXhr.slice(0, 3).join(' | '));
    report.check(`${tag} 7.3 Tidak ada aset 404`, missingAssets.length === 0, missingAssets.slice(0, 3).join(' | '));
    report.check(`${tag} 7.5 Waktu muat < ${LOAD_SANITY_MS / 1000} dtk (batas kewajaran, bukan SLA)`, elapsed < LOAD_SANITY_MS, `elapsed=${elapsed}ms`);
    report.finding(`${tag} 7.5 Waktu muat`, `${elapsed} ms`);
    if (warnings.length) report.finding(`${tag} 7.4 Warning console (${warnings.length})`, warnings.slice(0, 2).join(' | '));
  }

  report.print();
});
