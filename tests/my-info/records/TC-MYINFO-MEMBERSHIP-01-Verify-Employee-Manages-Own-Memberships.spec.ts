/**
 * ================================================================================
 * TC-MYINFO-MEMBERSHIP-01 — Verify An Employee Can Manage Their Own Memberships, With Required And Numeric-Amount Checks
 * Modul    : My Info - Memberships (ESS)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-D 1.8 | Negative (-) 2.1 | Boundary (B) 3.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-MEMBERSHIP-01-Verify-Employee-Manages-Own-Memberships.spec.ts
 * Path     : tests/my-info/records/
 * ================================================================================
 *
 * TUJUAN (sesi ESS, record sendiri):
 *   2.1   Add -> Save kosong -> "Required" di Membership (dropdown wajib), tanpa POST.
 *   3.2   Subscription Amount huruf ("abc") -> ditolak/validasi; negatif -> perilaku dicatat.
 *   1.1-C Add valid (Membership = opsi pertama, amount angka) -> POST memberships 200 + 1.8 toast.
 *   1.1-R muncul di tabel. 1.1-D hapus -> DELETE 200 & hilang.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/records/TC-MYINFO-MEMBERSHIP-01-Verify-Employee-Manages-Own-Memberships.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { MembershipsPage } from '../../../src/pages';
import { newEssSession, openMyInfoFromMenu, nextResponse, deleteRowContaining } from '../../../src/utils/myInfo';

test('TC-MYINFO-MEMBERSHIP-01: an employee manages their own memberships', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-MEMBERSHIP-01', 'Employee Manages Own Memberships', env.baseURL, page);

  report.step('Setup: akun ESS, buka My Info lalu tab Memberships');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoMem');
  const empNumber = await openMyInfoFromMenu(essPage);
  const mem = new MembershipsPage(essPage);
  await mem.goto(empNumber);

  report.step('[ESS UI] Add -> Save kosong -> validasi Required');
  await mem.addButton.click();
  await mem.membershipSelect.waitFor({ state: 'visible', timeout: 15_000 });
  let posted = false;
  essPage.on('request', (r) => { if (r.url().includes('/memberships') && r.method() === 'POST') posted = true; });
  await mem.save();
  report.check('2.1 Pesan "Required" muncul', await isVisibleWithWait(mem.fieldErrors.filter({ hasText: 'Required' }).first(), 6_000));
  report.check('2.1 Tidak ada POST utk form kosong', !posted);

  report.step('[ESS UI] Pilih Membership, isi Subscription Amount dgn huruf');
  await mem.membershipSelect.click();
  const firstMembership = (await essPage.getByRole('option').nth(1).innerText()).trim();
  await essPage.getByRole('option').nth(1).click();
  await mem.subscriptionAmountInput.fill('abc');
  await mem.save();
  const amtError = await isVisibleWithWait(mem.fieldErrors.filter({ hasText: /number|Should be|valid/i }).first(), 5_000);
  report.check('3.2 Subscription Amount huruf -> validasi angka (atau tidak tersimpan)', amtError || !posted, `error=${amtError}, posted=${posted}`);

  report.step('[ESS UI] Isi amount angka valid -> Save');
  await mem.subscriptionAmountInput.fill('150.00');
  const post = nextResponse(essPage, '/memberships', 'POST');
  await mem.save();
  const resp = await post;
  report.check('1.1-C / 6.1 POST memberships 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('1.8 Toast "Successfully Saved"', await isVisibleWithWait(essPage.getByText('Successfully Saved'), 10_000));
  report.check('1.1-R Membership muncul di tabel', await isVisibleWithWait(mem.tableRows.filter({ hasText: firstMembership }).first(), 10_000));

  report.step('[ESS UI] Hapus membership');
  const del = await deleteRowContaining(essPage, mem.tableRows, firstMembership, '/memberships');
  report.check('1.1-D / 6.1 DELETE memberships 200', del?.status() === 200, `status=${del?.status()}`);
  report.check('1.1-D Membership hilang dari tabel', await isHiddenWithWait(mem.tableRows.filter({ hasText: firstMembership }).first(), 10_000));

  await close();
  report.print();
});
