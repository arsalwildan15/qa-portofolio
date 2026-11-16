/**
 * ================================================================================
 * TC-MAINT-ACCESS-01 — Verify Downloading An Employee's Personal Data Record: Search, File Name, Content, No Secrets, And Who May Download
 * Modul    : Maintenance > Access Records (U087)
 * Kategori : Positive (+) 1.1-R 1.6 | Boundary (B) 3.6 | Edge (!) 4.1 4.6 4.8 |
 *            Security (S) 5.1-CmdPath 5.1-SQLi 5.1-XSS-Reflected 5.2-BFLAC 5.8 | API (A) 6.2 6.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MAINT-ACCESS-01-Verify-Downloading-An-Employees-Personal-Data-Record.spec.ts
 * Path     : tests/maintenance/access-records/
 * ================================================================================
 *
 * ALUR (dibuktikan LIVE 17 Nov 2026): pilih karyawan -> Search -> "Selected Employee" -> Download ->
 * GET /web/index.php/maintenance/accessEmployeeData/<empNumber> -> file "<Nama Karyawan>.json".
 * Nama file dibangun dari nama karyawan, sehingga karyawan uji kedua diberi nama berisi "../".
 *
 * TUJUAN:
 *   1.6        autocomplete Employee Name menawarkan karyawan uji.
 *   3.6 / 4.6  nama yang tidak ada -> tanpa opsi.   4.1 / 5.1-SQLi / 5.1-XSS-Reflected -> tanpa error/dialog.
 *   1.1-R      Search -> "Selected Employee" memuat karyawan uji; Download -> file .json.
 *   6.2        isi JSON: Employee[0].firstName/lastName = karyawan uji, ada bagian User/data lain.
 *   5.8        file tanpa field password/hash/secret/token/salt.
 *   5.1-CmdPath  karyawan bernama "Qa../../evil" -> nama file tanpa "/" atau "\" dan tidak berawalan "..".
 *   6.4        URL download tanpa sesi -> tidak mengembalikan data (401/redirect login).
 *   5.2-BFLAC  sesi ESS membuka URL download -> tidak mengembalikan data karyawan.
 *   4.8        file berisi data pribadi lengkap tanpa jejak siapa yg mengunduh -> dicatat (finding).
 *
 * RUN COMMAND:
 *   npx playwright test tests/maintenance/access-records/TC-MAINT-ACCESS-01-Verify-Downloading-An-Employees-Personal-Data-Record.spec.ts --project=chromium
 * ================================================================================
 */

import fs from 'node:fs';
import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { newEssSession } from '../../../src/utils/myInfo';
import { createEmployee, openMaintenance, suggestions, selectedEmployeeText } from '../../../src/utils/maintenanceData';

const API = '/web/index.php/api/v2/';
const SENSITIVE = /"(password|passwordHash|hash|secret|token|salt)"\s*:/i;
const hasEmployeeData = (text: string) => /"Employee"\s*:\s*\[\s*\{/.test(text);

test("TC-MAINT-ACCESS-01: downloading an employee's personal data record", async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-MAINT-ACCESS-01', 'Downloading An Employees Personal Data Record', env.baseURL, page);
  const s = `${Date.now() % 100000}`;
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const emp = await createEmployee(page.request, 'QaAccess', `D${s}`);
  const evil = await createEmployee(page.request, 'Qa../../evil', `X${s}`);
  const download = async (lastName: string) => {
    await openMaintenance(page, 'accessEmployeeData');
    await suggestions(page, lastName);
    await page.getByRole('option').filter({ hasText: lastName }).first().click();
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForLoadState('networkidle');
    const selected = await selectedEmployeeText(page);
    const dl = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Download' }).click();
    const d = await dl;
    const path = d ? await d.path().catch(() => null) : null;
    return { selected, name: d?.suggestedFilename() ?? '', url: d?.url() ?? '', text: path ? fs.readFileSync(path, 'utf8') : '' };
  };
  try {
    report.step('Autocomplete & input tidak biasa');
    await openMaintenance(page, 'accessEmployeeData');
    const opts = await suggestions(page, `QaAccess D${s}`);
    report.check('1.6 Autocomplete menawarkan karyawan uji', opts.some((o) => o.includes(`D${s}`)), opts.join(' | ') || '(kosong)');
    const none = await suggestions(page, `QaTidakAda${s}zz`);
    report.check('3.6 / 4.6 Nama yang tidak ada -> tanpa opsi karyawan', !none.some((o) => /QaTidakAda/.test(o)), none.join(' | ') || '(kosong)');
    for (const [label, q] of [['4.1 Teks Arab', 'مرحبا'], ['5.1-SQLi', "' OR 1=1 --"], ['5.1-XSS-Reflected', '<img src=x onerror=alert(1)>']] as const) {
      const o = await suggestions(page, q);
      const injected = await page.locator('img[src="x"]').count();
      report.check(`4.1 / 5.1-SQLi / 5.1-XSS-Reflected Input tidak biasa (${label}) di kotak cari -> tanpa error, dialog, atau elemen tersuntik`, injected === 0 && dialogs.length === 0, `opsi=${o.length}, img=${injected}, dialog=${dialogs.length}`);
    }

    report.step('Search & Download karyawan uji');
    const a = await download(`D${s}`);
    report.check('1.1-R Search -> "Selected Employee" memuat karyawan uji', a.selected.includes('Selected Employee') && a.selected.includes(`D${s}`), a.selected.slice(0, 140));
    report.check('1.1-R Download -> file .json', a.name.endsWith('.json') && a.text.length > 0, `file="${a.name}", url=${a.url.replace(/.*index\.php\//, '')}`);
    const json = (() => { try { return JSON.parse(a.text) as { Employee?: Array<{ firstName?: string; lastName?: string }>; [k: string]: unknown }; } catch { return null; } })();
    report.check('6.2 Isi JSON: Employee[0] = karyawan uji', json?.Employee?.[0]?.firstName === 'QaAccess' && json?.Employee?.[0]?.lastName === `D${s}`, JSON.stringify(json?.Employee?.[0] ?? null));
    report.check('5.8 File tanpa field password/hash/secret/token/salt', !SENSITIVE.test(a.text), SENSITIVE.exec(a.text)?.[0] ?? 'tidak ada');
    report.finding('4.8 Bagian data dalam file', Object.keys(json ?? {}).join(', ') + ' (data pribadi lengkap; tidak ada catatan siapa yang mengunduh di UI)');

    report.step('Nama file dari nama karyawan berisi "../"');
    const b = await download(`X${s}`);
    report.check('5.1-CmdPath Nama file tanpa "/" atau "\\" dan tidak berawalan ".."', !!b.name && !/[\\/]/.test(b.name) && !b.name.startsWith('..'), `file="${b.name}"`);

    report.step('Siapa yang boleh mengunduh');
    const anon = await request.newContext({ baseURL: env.baseURL });
    const noAuth = await anon.get(a.url, { maxRedirects: 0 });
    const noAuthText = await noAuth.text();
    await anon.dispose();
    report.check('6.4 URL download tanpa sesi -> tanpa data karyawan (401/redirect)', !hasEmployeeData(noAuthText) && noAuth.status() !== 200, `status=${noAuth.status()}`);
    const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaAccessEss');
    try {
      const ess = await essPage.request.get(a.url);
      const essText = await ess.text();
      report.check('5.2-BFLAC Sesi ESS membuka URL download -> tanpa data karyawan', !hasEmployeeData(essText), `status=${ess.status()}, data=${hasEmployeeData(essText)}`);
    } finally {
      await close();
    }
  } finally {
    await page.request.delete(`${API}pim/employees`, { data: { ids: [emp, evil] } });
  }
  report.print();
});
