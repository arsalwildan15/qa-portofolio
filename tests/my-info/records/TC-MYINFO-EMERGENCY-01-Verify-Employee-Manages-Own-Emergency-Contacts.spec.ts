/**
 * ================================================================================
 * TC-MYINFO-EMERGENCY-01 — Verify An Employee Can Add, See And Delete Their Own Emergency Contacts, With Required-Field Check
 * Modul    : My Info - Emergency Contacts (ESS)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-D 1.8 | Negative (-) 2.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-EMERGENCY-01-Verify-Employee-Manages-Own-Emergency-Contacts.spec.ts
 * Path     : tests/my-info/records/
 * ================================================================================
 *
 * TUJUAN:
 *   Emergency Contacts di My Info boleh dikelola karyawan sendiri (Add). TC (sesi ESS):
 *     2.1    Save form kosong -> pesan "Required" di Name & Relationship, tidak ada POST.
 *     1.1-C  Add valid -> POST pim/employees/<self>/emergency-contacts 200 & 1.8 toast sukses.
 *     1.1-R  kontak muncul di tabel.
 *     1.1-D  hapus kontak -> DELETE 200 & hilang dari tabel.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/records/TC-MYINFO-EMERGENCY-01-Verify-Employee-Manages-Own-Emergency-Contacts.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { EmergencyContactsPage } from '../../../src/pages';
import { newEssSession, openMyInfoFromMenu, nextResponse, deleteRowContaining } from '../../../src/utils/myInfo';

test('TC-MYINFO-EMERGENCY-01: an employee adds, sees and deletes their own emergency contacts', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-EMERGENCY-01', 'Employee Manages Own Emergency Contacts', env.baseURL, page);
  const name = `QaKontak ${Date.now() % 100000}`;

  report.step('Setup: akun ESS, buka My Info');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoEmerg');
  const empNumber = await openMyInfoFromMenu(essPage);
  const emerg = new EmergencyContactsPage(essPage);
  await emerg.goto(empNumber);

  report.step('[ESS UI] Add -> Save form kosong -> validasi Required');
  await emerg.addButton.click();
  await emerg.nameInput.waitFor({ state: 'visible', timeout: 15_000 });
  let posted = false;
  essPage.on('request', (r) => { if (r.url().includes('/emergency-contacts') && r.method() === 'POST') posted = true; });
  await emerg.save();
  report.check('2.1 Pesan "Required" muncul di form kosong', await isVisibleWithWait(emerg.fieldErrors.filter({ hasText: 'Required' }).first(), 6_000));
  report.check('2.1 Tidak ada POST terkirim utk form kosong', !posted);

  report.step('[ESS UI] Isi Name/Relationship/Mobile -> Save');
  await emerg.nameInput.fill(name);
  await emerg.relationshipInput.fill('Saudara');
  await emerg.mobileInput.fill('081234567890');
  const post = nextResponse(essPage, '/emergency-contacts', 'POST');
  await emerg.save();
  const resp = await post;
  report.check('1.1-C POST emergency-contacts 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('1.8 Toast "Successfully Saved" tampil', await isVisibleWithWait(essPage.getByText('Successfully Saved'), 10_000));
  report.check('1.1-R Kontak muncul di tabel', await isVisibleWithWait(emerg.tableRows.filter({ hasText: name }).first(), 10_000));

  report.step('[ESS UI] Hapus kontak');
  const del = await deleteRowContaining(essPage, emerg.tableRows, name, '/emergency-contacts');
  report.check('1.1-D DELETE emergency-contacts 200', del?.status() === 200, `status=${del?.status()}`);
  report.check('1.1-D Kontak hilang dari tabel', await isHiddenWithWait(emerg.tableRows.filter({ hasText: name }).first(), 10_000));

  await close();
  report.print();
});
