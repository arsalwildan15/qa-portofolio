/**
 * ================================================================================
 * TC-XMOD-05 — Verify An Emoji In A Name Is Handled With A Clear Message, Not A Server Error
 * Modul    : Lintas modul (Leave / Claim / Time) - form "nama unik"
 * Kategori : Edge Case (!) 4.1 | API (A) 6.1 | UI (8) 8.4 -- Error Handling / Internationalisation
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-XMOD-05-Verify-Emoji-In-Name-Handled-Without-Server-Error.spec.ts
 * Path     : tests/_global/cross-module/
 * ================================================================================
 *
 * TUJUAN:
 *   Emoji (karakter 4-byte, di luar BMP) di field Name boleh diterima ATAU ditolak, tetapi
 *   harus dgn respons yg terkendali dan pesan yg jelas ke user. Confirmed live 15 Nov 2026:
 *   - POST create (Claim Event, Leave Type, Time Customer) -> 422 [name] (terkendali, OK).
 *   - TAPI endpoint cek-nama-unik yg dipanggil form saat mengetik -> 500 "Unexpected Error
 *     Occurred": GET core/validation/unique (ClaimEvent, LeaveType) dan GET
 *     time/validation/customer-name. Form melempar "Uncaught exception: fe" (tak tertangani,
 *     pola BG-199), Save tidak menyimpan, dan user hanya melihat toast generik "Error /
 *     Unexpected Error Occurred" -- tidak ada petunjuk bahwa emoji penyebabnya.
 *   -> BUG. TC sengaja FAILED.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/cross-module/TC-XMOD-05-Verify-Emoji-In-Name-Handled-Without-Server-Error.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

type Form = { module: string; formPath: string; label: string; createPath: string; createBody: (n: string) => Record<string, unknown>; validationUrl: (n: string) => string };

const FORMS: Form[] = [
  { module: 'Claim Event', formPath: '/web/index.php/claim/saveEvents', label: 'Event Name', createPath: '/web/index.php/api/v2/claim/events',
    createBody: (n) => ({ name: n, description: '', status: true }),
    validationUrl: (n) => `/web/index.php/api/v2/core/validation/unique?value=${encodeURIComponent(n)}&entityName=ClaimEvent&attributeName=name&matchByField=isDeleted&matchByValue=false` },
  { module: 'Leave Type', formPath: '/web/index.php/leave/defineLeaveType', label: 'Name', createPath: '/web/index.php/api/v2/leave/leave-types',
    createBody: (n) => ({ name: n, situational: false }),
    validationUrl: (n) => `/web/index.php/api/v2/core/validation/unique?value=${encodeURIComponent(n)}&entityName=LeaveType&attributeName=name` },
  { module: 'Time Customer', formPath: '/web/index.php/time/addCustomer', label: 'Name', createPath: '/web/index.php/api/v2/time/customers',
    createBody: (n) => ({ name: n, description: '' }),
    validationUrl: (n) => `/web/index.php/api/v2/time/validation/customer-name?customerName=${encodeURIComponent(n)}` },
];

test('TC-XMOD-05: an emoji in a name is handled with a clear message, not a server error', async ({ page }, testInfo) => {
  testInfo.setTimeout(150_000);
  // The uncaught "AxiosError: fe" is part of the defect under test, so the automatic console
  // check is left ON (no whitelist, R3) -- it fails together with the functional checks.
  const report = new TestReport('TC-XMOD-05', 'Emoji In Name Handled Without Server Error', env.baseURL, page);
  const s = String(Date.now()).slice(-6);

  for (const f of FORMS) {
    const name = `QaEmoji 🚀 ${s}`;
    report.step(`[${f.module}] API: create & cek-nama-unik dgn emoji`);
    const create = await page.request.post(f.createPath, { data: f.createBody(name) });
    report.check(`[${f.module}] POST create -> respons terkendali (bukan 5xx)`, create.status() < 500, `status=${create.status()}`);
    const validation = await page.request.get(f.validationUrl(name));
    report.check(`[${f.module}] GET cek-nama-unik -> bukan 5xx`, validation.status() < 500, `status=${validation.status()}, body=${(await validation.text()).slice(0, 80)}`);

    report.step(`[${f.module}] UI: ketik nama dgn emoji, klik Save`);
    await page.goto(f.formPath);
    const input = page.locator('.oxd-input-group', { has: page.getByText(f.label, { exact: true }) }).locator('input');
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    const validated = page.waitForResponse((r) => r.url().includes('/validation/') && r.request().method() === 'GET', { timeout: 10_000 }).catch(() => null);
    await input.fill(name);
    const vResp = await validated;
    await page.getByRole('button', { name: 'Save' }).click();
    const feedback = page.locator('.oxd-input-field-error-message, .oxd-toast');
    const gotFeedback = await isVisibleWithWait(feedback.first(), 6_000);
    const messages = await feedback.allInnerTexts();
    const meaningful = gotFeedback && !messages.some((m) => /Unexpected Error Occurred/i.test(m));
    report.check(`[${f.module}] User mendapat pesan yg jelas (bukan "Unexpected Error Occurred")`, meaningful, `validationStatus=${vResp?.status()}, messages=${JSON.stringify(messages)}`);
  }

  report.print();
});
