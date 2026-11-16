/**
 * ================================================================================
 * TC-MYINFO-DEPENDENT-01 — Verify An Employee Can Manage Their Own Dependents, With Required And Future-Date Checks
 * Modul    : My Info - Dependents (ESS)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-D 1.8 | Negative (-) 2.1 | Boundary (B) 3.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-DEPENDENT-01-Verify-Employee-Manages-Own-Dependents.spec.ts
 * Path     : tests/my-info/records/
 * ================================================================================
 *
 * TUJUAN (sesi ESS, record sendiri):
 *   2.1   Add -> Save form kosong -> "Required" di Name & Relationship, tanpa POST.
 *   3.4   Date of Birth di masa depan -> perilaku dicatat (diterima/ditolak); bila diterima,
 *         dicatat sbg finding (OrangeHRM tidak memvalidasi DOB masa depan di dependents --
 *         known behaviour, bukan hard-fail di modul lama).
 *   1.1-C Add valid (Name, Relationship=Child, DOB lampau) -> POST dependents 200 + 1.8 toast.
 *   1.1-R muncul di tabel. 1.1-D hapus -> DELETE 200 & hilang.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/records/TC-MYINFO-DEPENDENT-01-Verify-Employee-Manages-Own-Dependents.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { DependentsPage } from '../../../src/pages';
import { fillDate } from '../../../src/utils/dateInput';
import { newEssSession, openMyInfoFromMenu, nextResponse, deleteRowContaining } from '../../../src/utils/myInfo';

test('TC-MYINFO-DEPENDENT-01: an employee manages their own dependents', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-DEPENDENT-01', 'Employee Manages Own Dependents', env.baseURL, page);
  const name = `QaAnak ${Date.now() % 100000}`;

  report.step('Setup: akun ESS, buka My Info lalu tab Dependents');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoDep');
  const empNumber = await openMyInfoFromMenu(essPage);
  const dep = new DependentsPage(essPage);
  await dep.goto(empNumber);

  report.step('[ESS UI] Add -> Save form kosong -> validasi Required');
  await dep.addButton.click();
  await dep.nameInput.waitFor({ state: 'visible', timeout: 15_000 });
  let posted = false;
  essPage.on('request', (r) => { if (r.url().includes('/dependents') && r.method() === 'POST') posted = true; });
  await dep.save();
  report.check('2.1 Pesan "Required" muncul', await isVisibleWithWait(dep.fieldErrors.filter({ hasText: 'Required' }).first(), 6_000));
  report.check('2.1 Tidak ada POST utk form kosong', !posted);

  report.step('[ESS UI] Boundary 3.4: Date of Birth di masa depan');
  await dep.nameInput.fill(name);
  await dep.selectDropdownOption(dep.relationshipSelect, 'Child');
  await fillDate(dep.dateOfBirthInput, '2099-01-01', 'yyyy-dd-mm');
  const futurePost = nextResponse(essPage, '/dependents', 'POST');
  await dep.save();
  const futureResp = await futurePost;
  report.finding('3.4 Date of Birth masa depan', `POST status=${futureResp?.status()} -> ${futureResp?.status() === 200 ? 'DITERIMA (tidak divalidasi; known behaviour)' : 'ditolak'}`);
  report.check('3.4 Respons terkendali (bukan 5xx)', (futureResp?.status() ?? 0) < 500, `status=${futureResp?.status()}`);

  report.step('[ESS UI] Add valid (DOB lampau)');
  await dep.goto(empNumber);
  await dep.addButton.click();
  await dep.nameInput.waitFor({ state: 'visible', timeout: 15_000 });
  const validName = `${name} V`;
  await dep.nameInput.fill(validName);
  await dep.selectDropdownOption(dep.relationshipSelect, 'Child');
  await fillDate(dep.dateOfBirthInput, '2015-05-10', 'yyyy-dd-mm');
  const post = nextResponse(essPage, '/dependents', 'POST');
  await dep.save();
  const resp = await post;
  report.check('1.1-C / 6.1 POST dependents 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('1.8 Toast "Successfully Saved"', await isVisibleWithWait(essPage.getByText('Successfully Saved'), 10_000));
  report.check('1.1-R Dependent muncul di tabel', await isVisibleWithWait(dep.tableRows.filter({ hasText: validName }).first(), 10_000));

  report.step('[ESS UI] Hapus dependent');
  const del = await deleteRowContaining(essPage, dep.tableRows, validName, '/dependents');
  report.check('1.1-D / 6.1 DELETE dependents 200', del?.status() === 200, `status=${del?.status()}`);
  report.check('1.1-D Dependent hilang dari tabel', await isHiddenWithWait(dep.tableRows.filter({ hasText: validName }).first(), 10_000));

  await close();
  report.print();
});
