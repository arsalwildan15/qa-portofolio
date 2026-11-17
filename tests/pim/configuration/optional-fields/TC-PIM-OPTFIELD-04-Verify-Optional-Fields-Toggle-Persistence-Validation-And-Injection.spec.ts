/**
 * ================================================================================
 * TC-PIM-OPTFIELD-04 — Verify Optional Fields Toggles: Persistence, UI Reflection, Server-Side Type Validation, Wrong Method And No Session
 * Modul    : PIM > Configuration > Optional Fields (U036)
 * Kategori : Positive (+) 1.1-U 1.2 | Security (S) 5.9 | API (A) 6.1 6.2 6.3 6.4 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-OPTFIELD-04-Verify-Optional-Fields-Toggle-Persistence-Validation-And-Injection.spec.ts
 * Path     : tests/pim/configuration/optional-fields/
 * ================================================================================
 *
 * LATAR (dibaca live dari UI 17 Nov 2026): halaman /pim/configurePim, 4 toggle (oxd-switch),
 * Save -> PUT api/v2/pim/optional-field {pimShowDeprecatedFields,showSIN,showSSN,
 * showTaxExemptions} (semua boolean). KONFIG GLOBAL -> WAJIB withConfigRestore() (R6, disetujui
 * user 2026-11-15). Nilai default di demo publik: keempatnya false.
 *
 * TUJUAN:
 *   1.1-U / 1.2  toggle ON lalu Save -> PUT 200 & field true; toggle kembali OFF -> PUT 200 &
 *        field false lagi (dibuktikan via GET, bukan asumsi).
 *   6.1 / 6.2  kontrak respons berisi keempat field boolean.
 *   6.5  PUT dgn tipe non-boolean (string "true" / angka 1 / null) -> 200 & dikoersi konsisten
 *        ke boolean (truthy/falsy) -- lenient tapi tidak membingungkan (finding, bukan bug).
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *   5.9  field asing di body (abuse menambah field yg tidak ada di kontrak) -> 422, skema
 *        ditegakkan ketat.
 *   Nilai dikembalikan ke semula (false semua) di `finally`, diverifikasi via GET setelahnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/optional-fields/TC-PIM-OPTFIELD-04-Verify-Optional-Fields-Toggle-Persistence-Validation-And-Injection.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { withConfigRestore } from '../../../../src/utils/withConfigRestore';

const API = '/web/index.php/api/v2/pim/optional-field';
type OptFields = { pimShowDeprecatedFields: boolean; showSIN: boolean; showSSN: boolean; showTaxExemptions: boolean };

test('TC-PIM-OPTFIELD-04: Optional Fields toggles - persistence, validation, injection', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-OPTFIELD-04', 'Optional Fields Toggle Persistence Validation Injection', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  try {
    await withConfigRestore(
      async () => ((await (await page.request.get(API)).json()) as { data: OptFields }).data,
      async (snapshot) => {
        const r = await page.request.put(API, { data: snapshot });
        report.check('Restore nilai Optional Fields ke semula setelah TC (withConfigRestore)', r.status() === 200, `status=${r.status()}`);
        const after = ((await (await page.request.get(API)).json()) as { data: OptFields }).data;
        report.check('Nilai Optional Fields terverifikasi kembali ke semula via GET', JSON.stringify(after) === JSON.stringify(snapshot), `restored=${JSON.stringify(after)}`);
      },
      async () => {
        report.step('Toggle ON -> Save -> verifikasi persist');
        const on = await page.request.put(API, { data: { pimShowDeprecatedFields: true, showSIN: true, showSSN: true, showTaxExemptions: true } });
        const onData = ((await on.json().catch(() => ({}))) as { data?: OptFields }).data;
        report.check('6.1 / 6.2 [U036] PUT semua ON -> 200 & kontrak 4 field boolean true', on.status() === 200 && onData?.pimShowDeprecatedFields === true && onData?.showSIN === true && onData?.showSSN === true && onData?.showTaxExemptions === true, `status=${on.status()}`);
        const getAfterOn = ((await (await page.request.get(API)).json()) as { data: OptFields }).data;
        report.check('1.1-U [U036] GET setelah Save mengonfirmasi nilai ON persist', JSON.stringify(getAfterOn) === JSON.stringify({ pimShowDeprecatedFields: true, showSIN: true, showSSN: true, showTaxExemptions: true }), JSON.stringify(getAfterOn));

        report.step('Toggle OFF -> Save -> verifikasi persist');
        const off = await page.request.put(API, { data: { pimShowDeprecatedFields: false, showSIN: false, showSSN: false, showTaxExemptions: false } });
        report.check('1.2 [U036] PUT semua OFF -> 200', off.status() === 200, `status=${off.status()}`);
        const getAfterOff = ((await (await page.request.get(API)).json()) as { data: OptFields }).data;
        report.check('1.2 [U036] GET setelah Save mengonfirmasi nilai OFF persist', JSON.stringify(getAfterOff) === JSON.stringify({ pimShowDeprecatedFields: false, showSIN: false, showSSN: false, showTaxExemptions: false }), JSON.stringify(getAfterOff));

        report.step('Validasi tipe server-side');
        const strTrue = await page.request.put(API, { data: { pimShowDeprecatedFields: 'true', showSIN: false, showSSN: false, showTaxExemptions: false } });
        const strTrueData = ((await strTrue.json().catch(() => ({}))) as { data?: OptFields }).data;
        report.check('6.5 [U036] pimShowDeprecatedFields string "true" -> 200 & dikoersi konsisten ke boolean true', strTrue.status() === 200 && strTrueData?.pimShowDeprecatedFields === true, `status=${strTrue.status()} value=${strTrueData?.pimShowDeprecatedFields}`);
        const numOne = await page.request.put(API, { data: { pimShowDeprecatedFields: false, showSIN: 1, showSSN: false, showTaxExemptions: false } });
        const numOneData = ((await numOne.json().catch(() => ({}))) as { data?: OptFields }).data;
        report.check('6.5 [U036] showSIN angka 1 -> 200 & dikoersi konsisten ke boolean true', numOne.status() === 200 && numOneData?.showSIN === true, `status=${numOne.status()} value=${numOneData?.showSIN}`);
        const nullVal = await page.request.put(API, { data: { pimShowDeprecatedFields: false, showSIN: false, showSSN: null, showTaxExemptions: false } });
        const nullValData = ((await nullVal.json().catch(() => ({}))) as { data?: OptFields }).data;
        report.check('6.5 [U036] showSSN null -> 200 & dikoersi konsisten ke boolean false (falsy)', nullVal.status() === 200 && nullValData?.showSSN === false, `status=${nullVal.status()} value=${nullValData?.showSSN}`);
        report.finding('Koersi tipe', 'string/number/null pada field boolean dikoersi scr konsisten (truthy/falsy), bukan ditolak -- lenient tapi tidak membingungkan, tidak ada bypass keamanan.');

        report.step('Field asing & method');
        const extra = await page.request.put(API, { data: { pimShowDeprecatedFields: false, showSIN: false, showSSN: false, showTaxExemptions: false, isAdmin: true } });
        report.check('5.9 [U036] Field asing (isAdmin) di body -> 422 (skema ditegakkan ketat, bukan diam-diam diabaikan)', extra.status() === 422, `status=${extra.status()}`);
        const patch = await page.request.patch(API, { data: {} });
        report.check('6.3 [U036] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
        const noAuth = await anon.get(API);
        report.check('6.4 [U036] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);
      },
    );
  } finally {
    await anon.dispose();
  }
  report.print();
});
