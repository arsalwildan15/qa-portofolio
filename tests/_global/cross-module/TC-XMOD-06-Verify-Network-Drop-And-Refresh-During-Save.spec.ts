/**
 * ================================================================================
 * TC-XMOD-06 — Verify A Dropped Connection Or A Refresh During Save Never Creates Duplicates
 * Modul    : Lintas modul (Claim Event / Time Customer / Leave Type forms)
 * Kategori : Edge Case (!) / Network Resilience
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-XMOD-06-Verify-Network-Drop-And-Refresh-During-Save.spec.ts
 * Path     : tests/_global/cross-module/
 * ================================================================================
 *
 * TUJUAN:
 *   (1) Koneksi putus TEPAT saat POST create (route.abort, util dropConnectionDuringSave):
 *       tidak ada data terbentuk, form kembali bisa dipakai (spinner .oxd-form-loader hilang),
 *       dan Save ulang setelah koneksi pulih membuat TEPAT SATU data. Bila form macet, TC
 *       memuat ulang halaman (jalur pemulihan user) sebelum Save ulang.
 *   (2) Refresh halaman saat POST create masih tertunda (util refreshDuringPendingSave):
 *       data terbentuk paling banyak SATU kali (tidak ada duplikat dari kiriman ulang).
 *       BATASAN: penundaan dilakukan di sisi browser (page.route), jadi request belum sampai
 *       server saat reload -> hasil teramati selalu 0. Cek ini membuktikan browser/app TIDAK
 *       mengirim ulang otomatis setelah reload; ia tidak menguji server yg sedang memproses.
 *   Dicek pada form create 3 modul: Claim Event, Time Customer, Leave Type.
 *   Cek console otomatis TETAP aktif (R3). Confirmed live 15 Nov 2026: di ketiga form spinner
 *   .oxd-form-loader TIDAK pernah hilang setelah POST putus + "Uncaught exception: fe" ->
 *   BUG BG-406 (konfirmasi ke-7 BG-199). Save ulang setelah reload -> tepat 1 data.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/cross-module/TC-XMOD-06-Verify-Network-Drop-And-Refresh-During-Save.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isHiddenWithWait } from '../../../src/utils/testReport';
import { dropConnectionDuringSave, refreshDuringPendingSave } from '../../../src/utils/networkEdge';

type Form = { module: string; formPath: string; label: string; createRoute: string; createRegex: RegExp; listPath: string };

const FORMS: Form[] = [
  { module: 'Claim Event', formPath: '/web/index.php/claim/saveEvents', label: 'Event Name', createRoute: '**/api/v2/claim/events', createRegex: /\/api\/v2\/claim\/events$/, listPath: '/web/index.php/api/v2/claim/events?limit=0' },
  { module: 'Time Customer', formPath: '/web/index.php/time/addCustomer', label: 'Name', createRoute: '**/api/v2/time/customers', createRegex: /\/api\/v2\/time\/customers$/, listPath: '/web/index.php/api/v2/time/customers?limit=0' },
  { module: 'Leave Type', formPath: '/web/index.php/leave/defineLeaveType', label: 'Name', createRoute: '**/api/v2/leave/leave-types', createRegex: /\/api\/v2\/leave\/leave-types$/, listPath: '/web/index.php/api/v2/leave/leave-types?limit=0' },
];

test('TC-XMOD-06: a dropped connection or a refresh during save never creates duplicates', async ({ page }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-XMOD-06', 'Network Drop And Refresh During Save', env.baseURL, page);
  const s = String(Date.now()).slice(-6);

  const countNamed = async (f: Form, name: string) =>
    (((await (await page.request.get(f.listPath)).json().catch(() => null))?.data ?? []) as Array<{ name: string }>).filter((x) => x.name === name).length;

  const openAndFill = async (f: Form, name: string) => {
    await page.goto(f.formPath);
    const input = page.locator('.oxd-input-group', { has: page.getByText(f.label, { exact: true }) }).locator('input');
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    // The form checks name uniqueness while typing; let that GET finish so Save is enabled.
    const validated = page.waitForResponse((r) => r.url().includes('/validation/'), { timeout: 8_000 }).catch(() => null);
    await input.fill(name);
    await validated;
    return input;
  };
  const save = () => page.getByRole('button', { name: 'Save' }).click({ timeout: 10_000 });

  for (const f of FORMS) {
    const dropName = `QaDrop ${f.module.split(' ')[0]} ${s}`;
    report.step(`[${f.module}] Koneksi putus saat POST create`);
    await openAndFill(f, dropName);
    await dropConnectionDuringSave(page, f.createRoute, save);
    report.check(`[${f.module}] Tidak ada data terbentuk saat koneksi putus`, (await countNamed(f, dropName)) === 0);
    // Confirmed live 15 Nov 2026 (Claim Event): the form's loading spinner never clears after
    // the aborted POST -- fields stay hidden and Save cannot be clicked until a reload.
    const usable = await isHiddenWithWait(page.locator('.oxd-form-loader'), 10_000);
    report.check(`[${f.module}] Form kembali bisa dipakai (spinner hilang <= 10 dtk) setelah koneksi putus`, usable);

    report.step(`[${f.module}] Save ulang setelah koneksi pulih${usable ? '' : ' (form macet -> muat ulang & isi ulang dulu)'}`);
    if (!usable) await openAndFill(f, dropName);
    const retry = page.waitForResponse((r) => f.createRegex.test(r.url()) && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null);
    await save().catch(() => {});
    const retryResp = await retry;
    report.check(`[${f.module}] Save ulang 200`, retryResp?.status() === 200, `status=${retryResp?.status()}`);
    report.check(`[${f.module}] Tepat SATU data terbentuk`, (await countNamed(f, dropName)) === 1, `count=${await countNamed(f, dropName)}`);

    const refreshName = `QaRefresh ${f.module.split(' ')[0]} ${s}`;
    report.step(`[${f.module}] Refresh halaman saat POST create tertunda`);
    await openAndFill(f, refreshName);
    await refreshDuringPendingSave(page, f.createRoute, () => save().catch(() => {}));
    const afterRefresh = await countNamed(f, refreshName);
    report.finding(`[${f.module}] Hasil refresh saat tertunda`, `jumlah data = ${afterRefresh} (penundaan di sisi browser -> 0 berarti tidak ada kiriman ulang otomatis setelah reload)`);
    report.check(`[${f.module}] Paling banyak SATU data (tidak ada duplikat)`, afterRefresh <= 1, `count=${afterRefresh}`);
  }

  report.print();
});
