/**
 * ================================================================================
 * TC-PIM-DEPENDENT-API-01 — Verify The Dependents API: Contract, Optional Date Of Birth, Date Format Validation, Relationship Type Enum With Free-Text
 * Modul    : PIM > Employee > Dependents (U091)
 * Kategori : Positive (+) 1.1-C 1.2 1.4 | Negative (-) 2.2 | API (A) 6.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DEPENDENT-API-01-Verify-Dependents-API-Contract-Optional-Date-Of-Birth-And-Format-Validation.spec.ts
 * Path     : tests/pim/dependents/
 * ================================================================================
 *
 * LATAR: POST pim/employees/<N>/dependents body {name,relationshipType,relationship,
 * dateOfBirth}. 5.2-MassAssign/5.1-SQLi/2.6/6.3/6.4/6.5 SUDAH dicakup TC-PIM-MUT-01
 * lintas-tab -- TC ini melengkapi GAP spesifik unit ini.
 *
 * TUJUAN:
 *   1.1-C / 1.4  create valid -> 200 & kontrak.
 *   1.2  dateOfBirth kosong (opsional) -> 200.
 *   2.2  dateOfBirth format tidak valid ("not-a-date") -> 422 (ditegakkan).
 *   1.4  relationshipType="other" + field relationship (teks bebas) terisi -> 200 &
 *        kontrak benar (relasi antar-entity antara enum & field pelengkapnya).
 *   [FINDING, bukan bug baru] dateOfBirth di MASA DEPAN (2099) -> 200 (diterima tanpa
 *        validasi logis usia) -- KONSISTEN dgn temuan yg sudah ada di Personal Details
 *        (TC-PIM-PD-04), bukan temuan baru, dicatat utk kelengkapan cakupan unit ini.
 *   Semua dependent uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug BARU ditemukan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/dependents/TC-PIM-DEPENDENT-API-01-Verify-Dependents-API-Contract-Optional-Date-Of-Birth-And-Format-Validation.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type Dependent = { id: string; name: string; relationshipType: string; relationship: string; dateOfBirth: string | null };

test('TC-PIM-DEPENDENT-API-01: Dependents API - contract, optional date of birth, format validation, relationship type', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PIM-DEPENDENT-API-01', 'Dependents API Contract Optional Date Of Birth Format Validation Relationship Type', env.baseURL);
  const emp = await createEmployee(page.request, 'QaDepApi', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/dependents`;
  const createdIds: string[] = [];

  try {
    report.step('Kontrak create valid');
    const ok = await page.request.post(api, { data: { name: 'QaDepApiTest', relationshipType: 'child', relationship: '', dateOfBirth: '2015-01-01' } });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: Dependent }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('1.1-C / 1.4 [U091] POST valid -> 200 + id/name/relationshipType/dateOfBirth', ok.status() === 200 && !!okData?.id && okData?.dateOfBirth === '2015-01-01', `status=${ok.status()}`);

    report.step('dateOfBirth opsional & format');
    const noDob = await page.request.post(api, { data: { name: 'QaDepApiNoDob', relationshipType: 'child', relationship: '', dateOfBirth: '' } });
    const noDobData = ((await noDob.json().catch(() => ({}))) as { data?: Dependent }).data;
    if (noDobData?.id) createdIds.push(noDobData.id);
    report.check('1.2 [U091] dateOfBirth kosong (opsional) -> 200', noDob.status() === 200, `status=${noDob.status()}`);
    const badDob = await page.request.post(api, { data: { name: 'QaDepApiBadDob', relationshipType: 'child', relationship: '', dateOfBirth: 'not-a-date' } });
    report.check('2.2 [U091] dateOfBirth format tidak valid -> 422 (ditegakkan)', badDob.status() === 422, `status=${badDob.status()}`);

    report.step('relationshipType=other + relationship (teks pelengkap)');
    const otherRel = await page.request.post(api, { data: { name: 'QaDepApiOther', relationshipType: 'other', relationship: 'Cousin', dateOfBirth: '2010-01-01' } });
    const otherRelData = ((await otherRel.json().catch(() => ({}))) as { data?: Dependent }).data;
    if (otherRelData?.id) createdIds.push(otherRelData.id);
    report.check('1.4 [U091] relationshipType="other" + relationship teks bebas -> 200 & kontrak benar', otherRel.status() === 200 && otherRelData?.relationshipType === 'other' && otherRelData?.relationship === 'Cousin', `status=${otherRel.status()}`);

    report.step('dateOfBirth masa depan (dicatat sbg finding, konsisten dgn TC-PIM-PD-04)');
    const futureDob = await page.request.post(api, { data: { name: 'QaDepApiFuture', relationshipType: 'child', relationship: '', dateOfBirth: '2099-01-01' } });
    const futureDobData = ((await futureDob.json().catch(() => ({}))) as { data?: Dependent }).data;
    if (futureDobData?.id) createdIds.push(futureDobData.id);
    report.finding('dateOfBirth masa depan diterima (konsisten, bukan temuan baru)', `POST dgn dateOfBirth="2099-01-01" -> status=${futureDob.status()} (diterima tanpa validasi logis usia) -- konsisten dgn temuan yg sudah ada di Personal Details (TC-PIM-PD-04), bukan bug baru.`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
