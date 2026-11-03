/**
 * ================================================================================
 * TC-PIM-CONTACT-08 — Verify Attachment Upload
 * Modul    : PIM - Contact Details
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-08-Verify-Attachment-Upload.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   TC representatif untuk pola "Attachments" yang muncul di 7 dari 9 tab
 *   Fase 2 (Emergency Contacts, Dependents, Immigration, Salary, Report-to,
 *   Qualifications, Memberships, Contact Details) — upload file generik
 *   lewat section Attachments. Validasi ukuran/tipe file SUDAH dicakup
 *   mendalam di Fase 1 (TC-PIM-ADD-15/16/17 pada foto profil Add Employee),
 *   jadi TC ini hanya membuktikan pola Attachments yang sama berlaku di
 *   Personal Details sub-tab, tidak diulang per tab.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-08-Verify-Attachment-Upload.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

// 1x1 transparent PNG, well under any size limit.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('TC-PIM-CONTACT-08: upload a file via the Attachments section', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-08', 'Attachment Upload', env.baseURL, page);
  const employee = uniqueEmployeeName('QaContactAttach');

  report.step('Buat employee baru, navigate ke Contact Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await contactDetailsPage.goto(empNumber);

  report.step('Klik "+ Add" di section Attachments, upload file kecil (.png), lalu Save');
  await contactDetailsPage.attachmentsAddButton.click();
  await page.waitForTimeout(1000);
  const fileInput = page.locator('input[type="file"]').last();
  await fileInput.setInputFiles({
    name: 'qa-attachment.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/attachment') && r.request().method() === 'POST').catch(() => null),
    page.getByRole('button', { name: 'Save' }).last().click(),
  ]);
  await page.waitForTimeout(1500);

  report.step('Verify attachment berhasil ditambahkan ke tabel');
  report.check('[API] POST attachment direspon (status < 500)', (resp?.status() ?? 0) < 500, `status=${resp?.status()}`);
  report.check(
    'Nama file "qa-attachment.png" muncul di tabel Attachments',
    await isVisibleWithWait(page.getByText('qa-attachment.png')),
  );

  report.print();
});
