/**
 * ================================================================================
 * TC-SWEEP-XBROWSER-01 — Verify Every Menu Page Loads Cleanly In Firefox And WebKit (Safari Engine)
 * Modul    : Semua menu (registry src/data/unitRegistry.ts)
 * Kategori : UI/UX (8.2) Cross-browser | 1.5 | 7.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-XBROWSER-01-Verify-Every-Menu-Loads-In-Firefox-And-WebKit.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN:
 *   Chromium sudah diukur per menu oleh TC-SWEEP-PAGE-01. TC ini meluncurkan Firefox dan WebKit
 *   (mesin Safari) langsung dari test, login Admin lewat form Login yg sebenarnya, lalu membuka
 *   SETIAP unit menu. Per browser x unit (label [U###] (browser)):
 *     8.2 / 1.5  halaman termuat (bukan login / "Credential Required", area konten berisi);
 *     8.2 / 7.1  tidak ada console error / uncaught exception.
 *   Error yg SAMA dgn Chromium (mis. BG-414 tab Job) tetap gagal di sini (R3) -- yg dicari
 *   adalah perbedaan perilaku antar-browser; perbedaan dicatat sbg finding.
 *   Jalankan dgn --project=chromium (TC ini sendiri yg memilih browser lain).
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-XBROWSER-01-Verify-Every-Menu-Loads-In-Firefox-And-WebKit.spec.ts --project=chromium
 * ================================================================================
 */

import { test, firefox, webkit, type BrowserType } from '@playwright/test';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { PAGE_UNITS, resolveUnitUrl } from '../../../src/data/unitRegistry';
import { passAdminAccessGate } from '../../../src/utils/adminAccessGate';

const ENGINES: Array<[string, BrowserType]> = [['firefox', firefox], ['webkit', webkit]];

test('TC-SWEEP-XBROWSER-01: every menu page loads cleanly in Firefox and WebKit', async ({}, testInfo) => {
  testInfo.setTimeout(PAGE_UNITS.length * ENGINES.length * 30_000);
  const report = new TestReport('TC-SWEEP-XBROWSER-01', 'Every Menu Loads In Firefox And WebKit', env.baseURL);

  for (const [name, engine] of ENGINES) {
    report.step(`[${name}] luncurkan browser & login Admin lewat form Login`);
    const browser = await engine.launch();
    const context = await browser.newContext({ baseURL: env.baseURL });
    const page = await context.newPage();
    await page.goto('/web/index.php/auth/login', { timeout: 90_000 });
    await page.getByPlaceholder('Username').fill(env.username);
    await page.getByPlaceholder('Password').fill(env.password);
    await page.getByRole('button', { name: 'Login' }).click();
    const loggedIn = await page.waitForURL(/dashboard/, { timeout: 60_000 }).then(() => true).catch(() => false);
    report.check(`[${name}] 8.2 Login Admin berhasil`, loggedIn, page.url());

    let errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`Uncaught exception: ${e.message}`));

    for (const unit of PAGE_UNITS) {
      const tag = `[${unit.id} ${unit.path}] (${name})`;
      const url = await resolveUnitUrl(page, unit);
      if (!url) { report.finding(`${tag} dilewati`, 'tidak ada record live utk URL detail'); continue; }
      // Resolvers for detail pages navigate to a helper page (e.g. pim/viewMyDetails). Let it finish
      // first: navigating away mid-load cancels its requests, which Firefox/WebKit then report as
      // console errors that would be wrongly blamed on THIS unit (seen on the first run).
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      errors = [];
      await page.goto(url).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await passAdminAccessGate(page);
      const onLogin = page.url().includes('/auth/login');
      const denied = await page.getByText('Credential Required').isVisible().catch(() => false);
      const contentChars = ((await page.locator('.oxd-layout-context').innerText().catch(() => '')) || '').trim().length;
      report.check(`${tag} 8.2 1.5 Halaman termuat`, !onLogin && !denied && contentChars > 0, `url=${page.url().split('/web/index.php')[1]}, contentChars=${contentChars}`);
      report.check(`${tag} 8.2 7.1 Tidak ada console error / uncaught exception`, errors.length === 0, errors.slice(0, 3).join(' | '));
    }
    await browser.close();
  }

  report.print();
});
