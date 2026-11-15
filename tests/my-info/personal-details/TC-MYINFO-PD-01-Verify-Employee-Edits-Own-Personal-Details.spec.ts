/**
 * ================================================================================
 * TC-MYINFO-PD-01 — Verify An Employee Can Edit Their Own Personal Details From My Info
 * Modul    : My Info - Personal Details (ESS)
 * Kategori : Positive (+) 1.1-U 1.5 1.8 | Negative (-) 2.4 (UI)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-PD-01-Verify-Employee-Edits-Own-Personal-Details.spec.ts
 * Path     : tests/my-info/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Karyawan (akun ESS sungguhan) membuka My Info lewat menu sidebar, mengubah field yg memang
 *   boleh ia ubah (Other Id, Gender, Marital Status), lalu Save:
 *     1.5  menu My Info terbuka utk ESS, di record miliknya sendiri;
 *     1.1-U PUT pim/employees/<self>/personal-details 200 & nilai tersimpan (dibaca ulang Admin);
 *     1.8  toast "Successfully Updated" tampil;
 *     2.4  field yg dikunci utk karyawan (Employee Id, Driver's License Number, Date of Birth)
 *          tampil DISABLED di UI (confirmed live 16 Nov 2026).
 *   Penegakan kunci tsb di sisi SERVER diuji terpisah di TC-MYINFO-PD-02.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/personal-details/TC-MYINFO-PD-01-Verify-Employee-Edits-Own-Personal-Details.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { PersonalDetailsPage } from '../../../src/pages';
import { newEssSession, openMyInfoFromMenu, nextResponse } from '../../../src/utils/myInfo';

test('TC-MYINFO-PD-01: an employee edits their own personal details from My Info', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-PD-01', 'Employee Edits Own Personal Details', env.baseURL, page);

  report.step('Setup: akun ESS sungguhan, login di sesi terpisah');
  const { ess, essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoPd');

  report.step('[ESS UI] Buka My Info lewat menu sidebar');
  const empNumber = await openMyInfoFromMenu(essPage);
  report.check('1.5 My Info terbuka di record milik sendiri', empNumber === ess.empNumber, `opened=${empNumber}, self=${ess.empNumber}`);

  const pd = new PersonalDetailsPage(essPage);
  await pd.firstNameInput.waitFor({ state: 'visible', timeout: 15_000 });
  await essPage.waitForLoadState('networkidle').catch(() => {});

  report.step('[ESS UI] Field terkunci tampil disabled');
  report.check('2.4 Employee Id disabled', await pd.employeeIdInput.isDisabled());
  report.check("2.4 Driver's License Number disabled", await pd.driversLicenseInput.isDisabled());
  report.check('2.4 Date of Birth disabled', await pd.dateOfBirthInput.isDisabled());

  report.step('[ESS UI] Ubah Other Id, Gender, Marital Status -> Save');
  const otherId = `OID${Date.now() % 100000}`;
  const otherIdInput = essPage.locator('.oxd-input-group', { has: essPage.getByText('Other Id', { exact: true }) }).locator('input');
  await otherIdInput.fill(otherId);
  await pd.clickFemaleRadio();
  await pd.selectDropdownOption(pd.maritalStatusSelect, 'Married');
  const put = nextResponse(essPage, `/pim/employees/${empNumber}/personal-details`, 'PUT');
  await pd.save();
  const resp = await put;
  report.check('1.1-U PUT personal-details 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('1.8 Toast "Successfully Updated" tampil', await isVisibleWithWait(essPage.getByText('Successfully Updated'), 10_000));

  report.step('[Admin API] Nilai tersimpan');
  const stored = (await (await page.request.get(`/web/index.php/api/v2/pim/employees/${empNumber}/personal-details`)).json().catch(() => null))?.data;
  report.check('1.1-U Other Id tersimpan', stored?.otherId === otherId, `otherId=${stored?.otherId}`);
  report.check('1.1-U Gender = Female (2) tersimpan', stored?.gender === 2 || stored?.gender === '2', `gender=${stored?.gender}`);
  report.check('1.1-U Marital Status = Married tersimpan', stored?.maritalStatus === 'Married', `maritalStatus=${stored?.maritalStatus}`);

  await close();
  report.print();
});
