/**
 * ================================================================================
 * TC-SWEEP-A11Y-01 — Verify Interactive Elements On Every Menu Have Accessible Names
 * Modul    : Semua menu (registry src/data/unitRegistry.ts)
 * Kategori : UI/UX (8.3) Accessibility dasar
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-SWEEP-A11Y-01-Verify-Interactive-Elements-Have-Accessible-Names.spec.ts
 * Path     : tests/_global/sweep/
 * ================================================================================
 *
 * TUJUAN:
 *   Taksonomi 8.3: "label/alt text/ARIA role ada untuk elemen interaktif utama". Per unit menu
 *   (label [U###]) dgn sesi Admin, pada elemen yg TAMPIL:
 *     - input/select/textarea punya nama aksesibel: aria-label, aria-labelledby, <label for=id>,
 *       <label> pembungkus, atau title. (Placeholder TIDAK dihitung sbg label -- WCAG 3.3.2/4.1.2:
 *       hilang saat diketik, tidak dibaca konsisten oleh screen reader.)
 *     - button & link ikon punya nama: teks terlihat, aria-label, aria-labelledby, atau title.
 *     - <img> punya atribut alt.
 *   Contoh elemen yg gagal (maks 3/kategori) dicatat sbg detail check.
 *   Pemeriksaan DOM transparan tanpa dependensi baru (pemasangan axe-core belum diizinkan di
 *   lingkungan ini; bisa ditambahkan kemudian utk audit WCAG penuh).
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/sweep/TC-SWEEP-A11Y-01-Verify-Interactive-Elements-Have-Accessible-Names.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { PAGE_UNITS, resolveUnitUrl } from '../../../src/data/unitRegistry';
import { passAdminAccessGate } from '../../../src/utils/adminAccessGate';

test('TC-SWEEP-A11Y-01: interactive elements on every menu have accessible names', async ({ page }, testInfo) => {
  testInfo.setTimeout(PAGE_UNITS.length * 20_000);
  const report = new TestReport('TC-SWEEP-A11Y-01', 'Interactive Elements Have Accessible Names', env.baseURL);

  for (const unit of PAGE_UNITS) {
    const tag = `[${unit.id} ${unit.path}]`;
    const url = await resolveUnitUrl(page, unit);
    if (!url) { report.finding(`${tag} dilewati`, 'tidak ada record live utk URL detail'); continue; }
    await page.goto(url).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await passAdminAccessGate(page);
    const r = await page.evaluate(() => {
      const visible = (el: Element) => { const b = (el as HTMLElement).getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const byIds = (ids: string | null) => (ids ?? '').split(/\s+/).map((i) => document.getElementById(i)?.textContent?.trim() ?? '').join(' ').trim();
      const desc = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${(typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '').split(' ').slice(0, 2).join('.')}`;
      const ctl: string[] = []; let ctlTotal = 0;
      for (const el of Array.from(document.querySelectorAll('input:not([type=hidden]), select, textarea'))) {
        if (!visible(el)) continue; ctlTotal++;
        const id = el.getAttribute('id');
        const named = !!el.getAttribute('aria-label')?.trim() || !!byIds(el.getAttribute('aria-labelledby')) ||
          (!!id && !!document.querySelector(`label[for="${CSS.escape(id)}"]`)) || !!el.closest('label') || !!el.getAttribute('title')?.trim();
        if (!named) ctl.push(desc(el));
      }
      const btn: string[] = []; let btnTotal = 0;
      for (const el of Array.from(document.querySelectorAll('button, a[href], [role=button]'))) {
        if (!visible(el)) continue; btnTotal++;
        // Accessible-name computation also takes a descendant image's alt and descendant aria-labels
        // (e.g. the brand link wraps <img alt="client brand banner">) -- counted as named.
        const childNamed = Array.from(el.querySelectorAll('img[alt], [aria-label]')).some((c) => (c.getAttribute('alt') ?? c.getAttribute('aria-label') ?? '').trim() !== '');
        const named = !!(el as HTMLElement).innerText?.trim() || !!el.getAttribute('aria-label')?.trim() || !!byIds(el.getAttribute('aria-labelledby')) || !!el.getAttribute('title')?.trim() || childNamed;
        if (!named) btn.push(desc(el));
      }
      const img: string[] = []; let imgTotal = 0;
      for (const el of Array.from(document.querySelectorAll('img'))) { if (!visible(el)) continue; imgTotal++; if (!el.hasAttribute('alt')) img.push(desc(el)); }
      return { ctl, ctlTotal, btn, btnTotal, img, imgTotal };
    });
    report.check(`${tag} 8.3 Field input punya label aksesibel (${r.ctlTotal - r.ctl.length}/${r.ctlTotal})`, r.ctl.length === 0, r.ctl.slice(0, 3).join(', '));
    report.check(`${tag} 8.3 Tombol/link punya nama aksesibel (${r.btnTotal - r.btn.length}/${r.btnTotal})`, r.btn.length === 0, r.btn.slice(0, 3).join(', '));
    report.check(`${tag} 8.3 Gambar punya alt (${r.imgTotal - r.img.length}/${r.imgTotal})`, r.img.length === 0, r.img.slice(0, 3).join(', '));
  }

  report.print();
});
