/**
 * ================================================================================
 * TC-PERF-KPI-05 — Verify Duplicate KPI Name (Same Job Title) Is Allowed
 * Modul    : Performance - Configure - KPIs
 * Kategori : Negative (-) 2.3 - Duplicate/Unique Conflict (bukti negatif)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-KPI-05-Verify-Duplicate-Name-Allowed.spec.ts
 * Path     : tests/performance/kpi/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi (dan mendokumentasikan sbg finding, BUKAN bug) bahwa KPI dgn nama PERSIS
 *   SAMA utk Job Title yg SAMA TIDAK ditolak oleh server -- tidak ada unique constraint utk
 *   kombinasi title+jobTitle. Dikonfirmasi live: 2 KPI dgn nama sama berhasil dibuat sbg 2
 *   record terpisah (id berbeda). Ini adalah TEMUAN DESAIN (app sengaja tidak menerapkan
 *   keunikan nama KPI), bukan kegagalan test -- didokumentasikan secara eksplisit sesuai
 *   kategori taksonomi 2.3 (Duplicate/Unique Conflict), yg justru mengharuskan
 *   kasus INI dicek, baik hasilnya ditolak ataupun diterima.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/kpi/TC-PERF-KPI-05-Verify-Duplicate-Name-Allowed.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PERF-KPI-05: creating a second KPI with the exact same name+Job Title succeeds (no unique constraint)', async ({
  page,
  performanceKpiPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PERF-KPI-05', 'Duplicate Name Allowed', env.baseURL, page);
  const dupName = `Dup Conflict Test ${Date.now()}`;

  report.step('Buat KPI pertama dgn nama unik');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(dupName);
  await performanceKpiPage.selectJobTitle('HR Manager');
  await performanceKpiPage.minRatingInput.fill('1');
  await performanceKpiPage.maxRatingInput.fill('5');
  const resp1 = await performanceKpiPage.save();
  const body1 = await resp1?.json().catch(() => null);
  report.check('[API] KPI pertama berhasil dibuat', resp1?.status() === 200, `id=${body1?.data?.id}`);

  report.step('Coba buat KPI KEDUA dgn nama + Job Title PERSIS SAMA');
  await performanceKpiPage.gotoAdd();
  await performanceKpiPage.kpiNameInput.fill(dupName);
  await performanceKpiPage.selectJobTitle('HR Manager');
  await performanceKpiPage.minRatingInput.fill('1');
  await performanceKpiPage.maxRatingInput.fill('5');
  const resp2 = await performanceKpiPage.save();
  const body2 = await resp2?.json().catch(() => null);

  report.step('Hasil: KPI kedua TIDAK ditolak -- tidak ada unique constraint nama+Job Title');
  report.check(
    '[API] KPI kedua dgn nama duplikat TETAP diterima (status 200) -- dikonfirmasi TIDAK ada validasi unique',
    resp2?.status() === 200,
    `status=${resp2?.status()}`,
  );
  report.check(
    '[API] ID KPI kedua BERBEDA dari yg pertama (2 record terpisah tersimpan)',
    body2?.data?.id !== undefined && body2?.data?.id !== body1?.data?.id,
    `id1=${body1?.data?.id}, id2=${body2?.data?.id}`,
  );

  report.finding(
    'Tidak ada unique constraint utk KPI title + Job Title',
    `Dua KPI dgn nama persis sama ("${dupName}") dan Job Title sama ("HR Manager") berhasil dibuat sbg record terpisah (id ${body1?.data?.id} dan ${body2?.data?.id}). Ini temuan desain, didokumentasikan eksplisit -- bukan diasumsikan bug, krn tidak semua field memang WAJIB unik secara bisnis.`,
  );

  report.print();
});
