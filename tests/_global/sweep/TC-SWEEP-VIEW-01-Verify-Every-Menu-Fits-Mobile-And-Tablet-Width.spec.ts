/**
 * ================================================================================
 * TC-SWEEP-VIEW-01 — Verify Every Menu Page Fits Phone And Tablet Widths Without Horizontal Scrolling
 * Modul    : Semua menu (registry src/data/unitRegistry.ts)
 * Kategori : UI/UX (8.1) Responsive / layout break
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-VIEW-01-Verify-Every-Menu-Fits-Mobile-And-Tablet-Width.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN:
 *   Per unit menu (label [U###]), buka halaman dgn sesi Admin di dua lebar layar -- ponsel
 *   375x812 dan tablet 768x1024 -- lalu verifikasi:
 *     8.1  dokumen tidak lebih lebar dari layar (scrollWidth <= innerWidth + 2px), yaitu tidak
 *          ada scroll horizontal halaman;
 *     8.1  navigasi tetap bisa dipakai: item menu sidebar tampil langsung, ATAU tombol hamburger
 *          (i.bi-list di topbar, confirmed live di 375px) membuka sidebar berisi item menu;
 *     8.1  area konten berisi (tidak kosong krn layout patah).
 *   Elemen yg lebar overflow-nya dicatat (tag + class) sbg finding utk mempermudah perbaikan.
 *   Tabel lebar yg di-scroll DI DALAM kontainernya sendiri tidak dihitung (wajar di layar kecil).
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-VIEW-01-Verify-Every-Menu-Fits-Mobile-And-Tablet-Width.spec.ts --project=chromium
 * ================================================================================
 */

import { expect } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { PAGE_UNITS, resolveUnitUrl } from '../../../src/data/unitRegistry';
import { passAdminAccessGate } from '../../../src/utils/adminAccessGate';

const VIEWPORTS = [
  { name: 'ponsel 375px', width: 375, height: 812 },
  { name: 'tablet 768px', width: 768, height: 1024 },
];

test('TC-SWEEP-VIEW-01: every menu page fits phone and tablet widths without horizontal scrolling', async ({ page, browser }, testInfo) => {
  testInfo.setTimeout(PAGE_UNITS.length * VIEWPORTS.length * 20_000);
  const report = new TestReport('TC-SWEEP-VIEW-01', 'Every Menu Fits Mobile And Tablet Width', env.baseURL);
  const storageState = await page.context().storageState();

  const urls = new Map<string, string | null>();
  for (const unit of PAGE_UNITS) urls.set(unit.id, await resolveUnitUrl(page, unit));

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ storageState, viewport: { width: vp.width, height: vp.height }, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
    const p = await context.newPage();
    for (const unit of PAGE_UNITS) {
      const tag = `[${unit.id} ${unit.path}] (${vp.name})`;
      const url = urls.get(unit.id);
      if (!url) { report.finding(`${tag} dilewati`, 'tidak ada record live utk URL detail'); continue; }
      await p.goto(url).catch(() => {});
      await p.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await passAdminAccessGate(p);
      const m = await p.evaluate(() => {
        const doc = document.documentElement;
        const vw = window.innerWidth;
        // Elements sticking out past the viewport that are NOT inside their own horizontal scroller.
        const offenders: string[] = [];
        for (const el of Array.from(document.querySelectorAll('body *')) as HTMLElement[]) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= vw + 2) continue;
          let a: HTMLElement | null = el.parentElement; let scrolled = false;
          while (a && a !== document.body) {
            const ox = getComputedStyle(a).overflowX;
            if ((ox === 'auto' || ox === 'scroll' || ox === 'hidden') && a.scrollWidth > a.clientWidth) { scrolled = true; break; }
            a = a.parentElement;
          }
          if (!scrolled) offenders.push(`${el.tagName.toLowerCase()}.${(el.className && typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 2).join('.')}`);
          if (offenders.length >= 3) break;
        }
        const ctx = document.querySelector('.oxd-layout-context') as HTMLElement | null;
        return { scrollWidth: doc.scrollWidth, innerWidth: vw, offenders, contentChars: (ctx?.innerText ?? '').trim().length };
      });
      // Navigation must stay usable, verified functionally: at narrow widths the sidebar collapses
      // behind the topbar hamburger (i.bi-list, confirmed live at 375px) -> tapping it must reveal
      // the menu items; where the sidebar is shown inline its items must simply be visible.
      // isVisible() and even boundingBox() report a collapsed sidebar's items as on-screen (the panel
      // clips them; seen live at 375px). "Usable" therefore means the item is the TOPMOST element at
      // its own centre point inside the viewport -- what a real tap would hit.
      const inViewport = () => p.evaluate(() => {
        const item = document.querySelector('.oxd-main-menu-item') as HTMLElement | null;
        if (!item) return false;
        const r = item.getBoundingClientRect();
        const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
        if (r.width === 0 || cx < 0 || cx > window.innerWidth || cy < 0 || cy > window.innerHeight) return false;
        const hit = document.elementFromPoint(cx, cy);
        return !!hit && (hit === item || item.contains(hit));
      }).catch(() => false);
      let navReachable = await inViewport();
      let navVia = 'sidebar langsung tampil';
      if (!navReachable) {
        const hamburger = p.locator('header i.bi-list, .oxd-topbar-header-hamburger').first();
        if (await hamburger.isVisible().catch(() => false)) {
          await hamburger.click().catch(() => {});
          // Poll the item's position until the side panel's slide-in animation brings it on screen.
          navReachable = await expect.poll(inViewport, { timeout: 5_000 }).toBe(true).then(() => true).catch(() => false);
          navVia = 'hamburger -> sidebar';
          await p.locator('.oxd-sidepanel-header-close').first().click().catch(() => {});
        } else navVia = 'hamburger tidak ditemukan';
      }
      report.check(`${tag} 8.1 Tanpa scroll horizontal halaman (scrollWidth <= lebar layar)`, m.scrollWidth <= m.innerWidth + 2, `scrollWidth=${m.scrollWidth}, innerWidth=${m.innerWidth}`);
      report.check(`${tag} 8.1 Navigasi menu tetap bisa dipakai`, navReachable, navVia);
      report.check(`${tag} 8.1 Area konten berisi`, m.contentChars > 0, `contentChars=${m.contentChars}`);
      if (m.offenders.length) report.finding(`${tag} 8.1 Elemen melewati lebar layar`, m.offenders.join(', '));
    }
    await context.close();
  }

  report.print();
});
