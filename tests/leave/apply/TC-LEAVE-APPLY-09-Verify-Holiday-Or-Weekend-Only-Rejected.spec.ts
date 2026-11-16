/**
 * ================================================================================
 * TC-LEAVE-APPLY-09 — Verify A Leave Falling Only On A Holiday Or A Weekend Is Rejected
 * Modul    : Leave - Apply Leave (ESS, API)
 * Kategori : Boundary (B) 3.4 | Security (S) 5.9
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-09-Verify-Holiday-Or-Weekend-Only-Rejected.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Request yg seluruh harinya bukan hari kerja tidak punya hari utk dipotong. Confirmed live:
 *   (1) tanggal libur hari kerja dari kalender Holidays (GET leave/holidays, mis. Christmas
 *   Day) dan (2) hari Sabtu sama2 ditolak 400 "Failed to Submit: No Working Days Selected",
 *   saldo tidak berubah. Tanggal libur diambil dinamis dari API, bukan di-hardcode.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-09-Verify-Holiday-Or-Weekend-Only-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssLeaveRequest } from '../../../src/utils/createEssLeaveRequest';

const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('TC-LEAVE-APPLY-09: a leave falling only on a holiday or only on a weekend is rejected', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-LEAVE-APPLY-09', 'Holiday Or Weekend Only Rejected', env.baseURL, page);

  report.step('Setup: ESS + entitlement 10 hari');
  const { essPage, close } = await createEssLeaveRequest(page, browser, addEmployeePage, 'QaLvHoliday', { apply: false });
  const balance = async () => (await (await essPage.request.get('/web/index.php/api/v2/leave/leave-balance/leave-type/1')).json().catch(() => null))?.data?.balance?.balance;
  const apply = (date: string) => essPage.request.post('/web/index.php/api/v2/leave/leave-requests', {
    data: { leaveTypeId: 1, fromDate: date, toDate: date, comment: null, duration: { type: 'full_day' } },
  });

  report.step('[Admin API] Cari hari libur mendatang yg jatuh di hari kerja (Senin-Jumat)');
  const year = new Date().getFullYear();
  const today = toIso(new Date());
  const holidays = ((await (await page.request.get(`/web/index.php/api/v2/leave/holidays?fromDate=${year}-01-01&toDate=${year}-12-31`)).json().catch(() => null))?.data ?? []) as Array<{ date: string; name: string; length: number }>;
  const holiday = holidays.find((h) => h.date > today && h.length === 0 && ![0, 6].includes(new Date(`${h.date}T00:00:00`).getDay()));
  report.finding('Hari libur yg dipakai', holiday ? `${holiday.name} (${holiday.date})` : 'tidak ada hari libur full-day mendatang di periode ini');

  if (holiday) {
    report.step(`[ESS API] Apply hanya pada ${holiday.date}`);
    const resp = await apply(holiday.date);
    const body = await resp.json().catch(() => null);
    report.check('Request hari libur ditolak 400', resp.status() === 400, `status=${resp.status()}`);
    report.check('Pesan "No Working Days Selected"', /No Working Days Selected/.test(body?.error?.message ?? ''), `message=${body?.error?.message}`);
  }

  report.step('[ESS API] Apply hanya pada hari Sabtu');
  const saturday = new Date();
  saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7) + 7);
  const satResp = await apply(toIso(saturday));
  const satBody = await satResp.json().catch(() => null);
  report.check('Request hari Sabtu ditolak 400', satResp.status() === 400, `date=${toIso(saturday)}, status=${satResp.status()}`);
  report.check('Pesan "No Working Days Selected"', /No Working Days Selected/.test(satBody?.error?.message ?? ''), `message=${satBody?.error?.message}`);

  report.check('Saldo tetap 10', (await balance()) === 10, `balance=${await balance()}`);

  await close();
  report.print();
});
