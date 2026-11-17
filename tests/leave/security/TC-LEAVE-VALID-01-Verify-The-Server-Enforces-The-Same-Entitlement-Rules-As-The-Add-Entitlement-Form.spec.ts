/**
 * ================================================================================
 * TC-LEAVE-VALID-01 — Verify The Server Enforces The Same Entitlement Rules As The Add Entitlement Form (Upper Bound, Decimal Places)
 * Modul    : Leave > Entitlements > Add Entitlements (U045)
 * Kategori : Boundary (B) 3.2 | Edge (!) 4.8 | Security (S) 5.9
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-VALID-01-Verify-The-Server-Enforces-The-Same-Entitlement-Rules-As-The-Add-Entitlement-Form.spec.ts
 * Path     : tests/leave/security/
 * ================================================================================
 *
 * LATAR: form Add Entitlement menolak dua hal yang dibuktikan LIVE 17 Nov 2026:
 *   - nilai >= 10000 ("Should be less than 10000")
 *   - lebih dari 2 angka desimal ("Should be a number with upto 2 decimal places")
 * TC ini membuktikan dulu di FORM, lalu mengirim body yang sama ke API dengan sesi Admin
 * yang sama (bukan klien lain) untuk membuktikan server menegakkan aturan yang sama.
 *
 * TUJUAN:
 *   3.2  Form menolak entitlement 10000 & 9999.999 (3 desimal); menerima 9999.99 (batas).
 *   5.9 / 4.8  API menerima (200) KETIGANYA -- termasuk 10000 dan 9999.999 -- dgn body yang
 *        SAMA PERSIS seperti yang form baru saja tolak.
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-454 (Low) -- API menerima entitlement >= 10000 dan nilai dgn
 *   lebih dari 2 desimal; batas & presisi hanya ditegakkan di form, bisa dilewati lewat
 *   API/skrip (karyawan bisa diberi saldo cuti tak terbatas atau pecahan aneh seperti
 *   9999.999 hari).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/security/TC-LEAVE-VALID-01-Verify-The-Server-Enforces-The-Same-Entitlement-Rules-As-The-Add-Entitlement-Form.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { cleanupLeave, firstLeaveTypeId, grantEntitlement } from '../../../src/utils/leaveData';

test('TC-LEAVE-VALID-01: the server enforces the same entitlement rules as the Add Entitlement form', async ({ page, leaveEntitlementPage }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-LEAVE-VALID-01', 'Server Enforces Same Entitlement Rules As Form', env.baseURL, page);
  const emp = await createEmployee(page.request, 'QaEntValid', `L${Date.now() % 100000}`);
  const typeId = await firstLeaveTypeId(page.request);
  const entitlementField = () => page.locator('.oxd-input-group', { has: page.getByText('Entitlement', { exact: true }) }).locator('input');
  const errorFor = async (value: string): Promise<string> => {
    await entitlementField().fill(value);
    await page.locator('.oxd-input-group', { has: page.getByText('Entitlement', { exact: true }) }).click();
    await page.locator('.oxd-input-field-error-message').first().waitFor({ timeout: 5_000 }).catch(() => null);
    return (await leaveEntitlementPage.fieldErrors.allInnerTexts()).join(' | ');
  };
  try {
    await leaveEntitlementPage.goto();
    await page.waitForLoadState('networkidle');
    await leaveEntitlementPage.selectEmployee('QaEntValid');
    await leaveEntitlementPage.selectLeaveType('CAN - Bereavement');

    const okErr = await errorFor('9999.99');
    report.check('3.2 Form: 9999.99 (batas atas) -> diterima, tanpa pesan', okErr === '', okErr || '(ok)');

    const boundErr = await errorFor('10000');
    report.check('3.2 Form: 10000 -> ditolak ("Should be less than 10000")', /less than 10000/.test(boundErr), boundErr || '(tanpa pesan)');
    const boundApi = await grantEntitlement(page.request, emp, typeId, '10000');
    report.check('5.9 / 4.8 API: entitlement=10000 (body yg sama) -> juga ditolak (422)', boundApi.status() === 422, `status=${boundApi.status()}`);

    const decErr = await errorFor('9999.999');
    report.check('3.2 Form: 9999.999 (3 desimal) -> ditolak ("upto 2 decimal places")', /2 decimal places/.test(decErr), decErr || '(tanpa pesan)');
    const decApi = await grantEntitlement(page.request, emp, typeId, '9999.999');
    report.check('5.9 / 4.8 API: entitlement=9999.999 (body yg sama) -> juga ditolak (422)', decApi.status() === 422, `status=${decApi.status()}`);
  } finally {
    await cleanupLeave(page.request, [emp]);
  }
  report.print();
});
