/**
 * ================================================================================
 * TC-PIM-CONTACT-03 — Verify Invalid Work Email Is Silently Cleared Client-Side (Not Rejected, Not Accepted)
 * Modul    : PIM - Contact Details
 * Kategori : Negative (-) 2.2 | Edge Case (!) 4.8
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-03-Verify-Invalid-Email-Format-Not-Validated.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * KOREKSI 17 Nov 2026 (R3-adjacent, bug SKRIP ditemukan & diperbaiki, bukan bug app baru):
 * Versi TC ini sebelumnya menyimpulkan "Work Email TIDAK divalidasi, string tersimpan tanpa
 * error" HANYA dari status PUT 200 & tidak ada elemen error di DOM -- TANPA memverifikasi
 * NILAI SEBENARNYA yg terkirim/tersimpan. Investigasi ulang membuktikan klaim itu SALAH:
 * input.fill('not-an-email') MEMANG berhasil mengisi field (inputValue() langsung setelah
 * fill = "not-an-email"), TAPI nilainya DIKOSONGKAN SENDIRI oleh app (client-side) sebelum
 * Save — body PUT yg benar2 terkirim adalah `workEmail: null`, BUKAN "not-an-email" (dicek
 * via page.on('request') menangkap request body asli). TC lama lolos "palsu" krn 200 memang
 * benar (body yg terkirim sudah null, bukan string invalid), bukan krn app menerima string
 * invalid tanpa validasi.
 *
 * TUJUAN (TC ditulis ulang agar memverifikasi NILAI SEBENARNYA, bukan cuma status code):
 *   2.2  Isi Work Email dgn format tidak valid ("not-an-email") -> field DIKOSONGKAN
 *        SENDIRI oleh app sblm Save (bukan ditolak dgn pesan error, bukan diterima &
 *        tersimpan sbg string invalid) -- hasil akhir ini KONSISTEN di setiap run.
 *   4.8  [TEMUAN] Apakah pesan error sempat tampil sblm field dikosongkan TIDAK KONSISTEN
 *        antar-run (race condition pd validasi async-nya sendiri) -- dicatat sbg finding,
 *        bukan hard-check, krn hasil akhirnya (field selalu kosong) sudah cukup utk
 *        menyimpulkan user tidak mendapat jaminan feedback yg bisa diandalkan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-03-Verify-Invalid-Email-Format-Not-Validated.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-CONTACT-03: invalid work email is silently cleared client-side, not rejected nor accepted as-is', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-03', 'Invalid Email Format Silently Cleared Client-Side', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Contact Details');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaContactEmail');
  await contactDetailsPage.goto(empNumber);

  report.step('Fill Work Email = "not-an-email" (format tidak valid), lalu blur (pindah fokus)');
  await contactDetailsPage.workEmailInput.fill('not-an-email');
  const valueRightAfterFill = await contactDetailsPage.workEmailInput.inputValue();
  report.check('Input menerima ketikan "not-an-email" sesaat setelah fill', valueRightAfterFill === 'not-an-email', `value=${valueRightAfterFill}`);
  await contactDetailsPage.workEmailInput.blur();

  report.step('Tunggu app mengosongkan sendiri field (dikonfirmasi deterministik setelah blur eksplisit), lalu Save');
  await page.waitForTimeout(1000);
  const valueBeforeSave = await contactDetailsPage.workEmailInput.inputValue();
  const errorCountBeforeSave = await contactDetailsPage.fieldErrors.count();
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/contact-details') && r.request().method() === 'PUT'),
    contactDetailsPage.save(),
  ]);

  report.step('Verify: field dikosongkan sendiri (bukan ditolak dgn pesan, bukan diterima sbg string invalid)');
  report.check('2.2 [U089] Field Work Email DIKOSONGKAN SENDIRI oleh app sblm Save (bukan tetap "not-an-email")', valueBeforeSave === '', `valueBeforeSave="${valueBeforeSave}"`);
  const postData = resp.request().postData();
  report.check('2.2 [U089] Body PUT yg benar2 terkirim workEmail=null (BUKAN string "not-an-email")', !!postData && JSON.parse(postData).workEmail === null, `postData=${postData}`);
  report.check('[API] PUT -> 200 (konsisten dgn body workEmail=null yg valid)', resp.status() === 200, `status=${resp.status()}`);

  report.finding(
    'Work Email format tidak valid dikosongkan diam-diam; pesan error TIDAK KONSISTEN (race condition)',
    `Mengisi Work Email dgn format tidak valid ("not-an-email") SELALU membuat app mengosongkan field itu sendiri sblm Save terkirim (dikonfirmasi deterministik di langkah sebelumnya) -- Save tetap sukses (200) dgn workEmail=null. TAPI apakah pesan error sempat tampil ke user TIDAK KONSISTEN antar-run (diverifikasi berulang: terkadang 0 error, terkadang 1 error muncul) -- sebuah race condition pada validasi async-nya sendiri, terlepas dari hasil akhir (field selalu kosong) yg konsisten. errorCount pada run ini=${errorCountBeforeSave}. TC versi sebelumnya salah menyimpulkan "diterima tanpa validasi" krn hanya memeriksa status code, tidak memeriksa nilai yg benar2 terkirim.`,
  );

  report.print();
});
