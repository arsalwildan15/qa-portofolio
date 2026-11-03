/**
 * ================================================================================
 * TC-PIM-ADD-17 — Verify Photo Dimension Far From Recommended
 * Modul    : PIM - Add Employee
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-17-Verify-Photo-Dimension-Far-From-Recommended.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi apakah foto dengan dimensi sangat jauh dari rekomendasi
 *   UI (200x200px) ditolak hard, atau hanya rekomendasi tanpa validasi
 *   keras (UI menulis "Recommended dimensions", bukan "Required").
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-17-Verify-Photo-Dimension-Far-From-Recommended.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

// 2000x2000 solid-color PNG, well under 1MB, far from the 200x200 recommendation.
const LARGE_DIMENSION_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAB9AAAAfQAQMAAACf+01rAAAABlBMVEUAAAD///+l2Z/dAAAACklEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAIC3AYbQAAHaHM1mAAAAAElFTkSuQmCC';

test('TC-PIM-ADD-17: photo with dimensions far from 200x200 is handled', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-17', 'Photo Dimension Far From Recommended', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPhotoDim');

  report.step('Navigate ke Add Employee, fill nama, upload foto berdimensi jauh dari 200x200 (2000x2000)');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.fileInput.setInputFiles({
    name: 'oversized-dimension.png',
    mimeType: 'image/png',
    buffer: Buffer.from(LARGE_DIMENSION_PNG_BASE64, 'base64'),
  });

  report.step('Klik Save, verify apakah ditolak (hard validation) atau diterima (hanya rekomendasi)');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  report.finding(
    'Dimension 200x200px pada UI hanya teks "Recommended dimensions"',
    `status=${resp.status()} — foto 2000x2000 ${resp.status() === 200 ? 'DITERIMA (tidak ada hard validation dimensi)' : 'DITOLAK'}.`,
  );
  report.check('[API] status < 500 (server tidak crash)', resp.status() < 500, `status=${resp.status()}`);

  report.print();
});
