/**
 * ================================================================================
 * TC-MYINFO-CONTACT-01 — Verify An Employee Edits Their Own Contact Details, With Email Format And XSS Checks
 * Modul    : My Info - Contact Details (ESS)
 * Kategori : Positive (+) 1.1-U 1.8 | Negative (-) 2.2 | Security (S) 5.1-XSS-Stored
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-CONTACT-01-Verify-Employee-Edits-Own-Contact-Details.spec.ts
 * Path     : tests/my-info/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Karyawan (ESS) mengubah Contact Details miliknya:
 *     1.1-U  Street/City/Mobile/Work Email valid -> PUT pim/employee/<self>/contact-details 200
 *            & tersimpan (dibaca Admin). (Endpoint memakai path TUNGGAL "employee", confirmed live.)
 *     1.8    toast "Successfully Updated".
 *     2.2    Work Email format salah ("bukan-email") -> pesan validasi, tidak tersimpan.
 *     5.1-XSS-Stored  payload <img src=x onerror=...> di Street 1 disimpan sbg teks, tidak
 *            tereksekusi saat halaman dibuka ulang (oleh ESS maupun Admin).
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/contact-details/TC-MYINFO-CONTACT-01-Verify-Employee-Edits-Own-Contact-Details.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { ContactDetailsPage } from '../../../src/pages';
import { newEssSession, openMyInfoFromMenu, nextResponse, gotoTabAndHydrate } from '../../../src/utils/myInfo';

test('TC-MYINFO-CONTACT-01: an employee edits their own contact details, with email and XSS checks', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-CONTACT-01', 'Employee Edits Own Contact Details', env.baseURL, page);
  const stamp = Date.now() % 100000;

  report.step('Setup: akun ESS, buka My Info lalu tab Contact Details');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoContact');
  const empNumber = await openMyInfoFromMenu(essPage);
  const contact = new ContactDetailsPage(essPage);
  const tabUrl = `/web/index.php/pim/contactDetails/empNumber/${empNumber}`;
  const api = `/web/index.php/api/v2/pim/employee/${empNumber}/contact-details`;
  await gotoTabAndHydrate(essPage, tabUrl, '/contact-details');
  await contact.street1Input.waitFor({ state: 'visible', timeout: 15_000 });

  report.step('[ESS UI] Isi Street 1 / City / Mobile / Work Email valid -> Save');
  const city = `Kota${stamp}`;
  const email = `ess${stamp}@example.com`;
  await contact.street1Input.fill(`Jl. Mawar ${stamp}`);
  await contact.cityInput.fill(city);
  await contact.mobileInput.fill('081234567890');
  await contact.workEmailInput.fill(email);
  const put = nextResponse(essPage, `/pim/employee/${empNumber}/contact-details`, 'PUT');
  await contact.save();
  const resp = await put;
  report.check('1.1-U / 6.1 PUT contact-details 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('1.8 Toast "Successfully Updated"', await isVisibleWithWait(essPage.getByText('Successfully Updated'), 10_000));
  const stored = (await (await page.request.get(api)).json().catch(() => null))?.data;
  report.check('1.1-U City & Work Email tersimpan', stored?.city === city && stored?.workEmail === email, `city=${stored?.city}, email=${stored?.workEmail}`);

  report.step('[ESS UI] Work Email format salah -> validasi');
  await gotoTabAndHydrate(essPage, tabUrl, '/contact-details');
  await contact.workEmailInput.waitFor({ state: 'visible', timeout: 15_000 });
  await contact.workEmailInput.fill('bukan-email');
  await contact.save();
  const emailError = await isVisibleWithWait(contact.fieldErrors.filter({ hasText: /Expected format|valid|email/i }).first(), 6_000);
  const afterBad = (await (await page.request.get(api)).json().catch(() => null))?.data;
  report.check('2.2 Email invalid ditolak (pesan validasi atau tidak tersimpan)', emailError || afterBad?.workEmail === email, `error=${emailError}, stored=${afterBad?.workEmail}`);

  report.step('[ESS API] Simpan payload XSS di Street 1');
  const payload = `<img src=x onerror="window.__ciXss=1">S${stamp}`;
  const xssPut = await essPage.request.put(api, { data: { ...stored, street1: payload, workEmail: email } });
  report.check('[API] XSS tersimpan apa adanya (sanitasi bukan di input)', xssPut.status() === 200);

  report.step('[ESS UI] Payload tampil sbg teks di Contact Details');
  await gotoTabAndHydrate(essPage, tabUrl, '/contact-details');
  await contact.street1Input.waitFor({ state: 'visible', timeout: 15_000 });
  report.check('5.1-XSS-Stored Payload tidak tereksekusi (ESS)', (await essPage.evaluate(() => (window as unknown as { __ciXss?: number }).__ciXss)) === undefined && (await essPage.locator('img[src="x"]').count()) === 0);
  report.check('5.1-XSS-Stored Street 1 berisi payload sbg teks', (await contact.street1Input.inputValue()).includes(`S${stamp}`));

  report.step('[Admin UI] Payload tampil sbg teks di halaman Admin');
  await page.goto(api.replace('/api/v2/pim/employee/', '/pim/contactDetails/empNumber/').replace('/contact-details', ''));
  const adminStreet = page.locator('.oxd-input-group', { has: page.getByText('Street 1', { exact: true }) }).locator('input');
  await adminStreet.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  report.check('5.1-XSS-Stored Payload tidak tereksekusi (Admin)', (await page.evaluate(() => (window as unknown as { __ciXss?: number }).__ciXss)) === undefined && (await page.locator('img[src="x"]').count()) === 0);

  await close();
  report.print();
});
