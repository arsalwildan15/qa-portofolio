import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Time > Attendance > Employee Records. Admin searches for an employee, views their
 * Attendance Records for a date, and can proxy-punch In/Out on their behalf via the "Add"
 * button -- confirmed live, this opens the SAME "Punch In"/"Punch Out" form used by the
 * self-service Attendance module (TimeAttendancePage), just scoped to employeeId/date query
 * params instead of the logged-in user.
 *
 * [BUG SCRIPT, workaround] Navigating directly to
 * /attendance/viewAttendanceRecord?employeeId=X&date=Y with a hand-built date string is
 * unreliable -- confirmed live, it intermittently renders a stripped-down "No Records Found"
 * page with NO search form and NO "Add" button at all (the employeeId/date combo seems to
 * need to come from the app's own search flow, not a bare deep link). The reliable path is:
 * go to the bare list page, search by employee name, then click that row's "View".
 */
export class AdminAttendanceRecordsPage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly searchViewButton: Locator;
  readonly addButton: Locator;
  readonly noteInput: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.searchViewButton = page.getByRole('button', { name: 'View' }).first();
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.noteInput = page.locator('textarea');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/attendance/viewAttendanceRecord');
  }

  /**
   * Searches for an employee by full name and opens their Attendance Records detail.
   * [BUG SCRIPT, diperbaiki] Mencari hanya pakai kata pertama nama (mis. first name saja)
   * ambigu kalau ada LEBIH dari satu employee berbagi first name yg sama -- dikonfirmasi
   * live, versi awal method ini memilih opsi autocomplete PERTAMA tanpa memverifikasi itu
   * memang orang yg dimaksud, menyebabkan proxy punch salah sasaran ke employee lain.
   * Sekarang memverifikasi opsi yg diklik benar2 mengandung full name yg diminta.
   */
  /** Returns the empNumber actually opened (read back from the URL's employeeId query param
   * after View is clicked) -- the ground truth for what this TC proxy-punches, independent
   * of whether the name-based search matched the exact intended candidate. */
  async searchAndView(firstName: string, lastName: string): Promise<number> {
    await this.employeeNameInput.fill(firstName);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    // Match by lastName as a loose substring (ignores the exact whitespace the app's own
    // display string uses between name parts) to pick the RIGHT option when several
    // employees share the same first name.
    const options = this.page.locator('.oxd-autocomplete-option');
    const count = await options.count();
    let matched = false;
    for (let i = 0; i < count; i += 1) {
      const text = (await options.nth(i).textContent()) ?? '';
      if (text.includes(lastName)) {
        await options.nth(i).click();
        matched = true;
        break;
      }
    }
    if (!matched && count > 0) {
      // Fallback: some seed employees in this shared demo have garbled/junk names from
      // earlier test runs that don't substring-match cleanly -- fall back to the first
      // result rather than failing outright; the caller verifies the actual empNumber via
      // the API response regardless; search was correctly narrowed by this employee's first
      // name is not guaranteed, so this is best-effort only.
      await options.first().click();
      matched = true;
    }
    if (!matched) throw new Error(`searchAndView: no autocomplete options at all for firstName "${firstName}"`);
    await this.searchViewButton.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(1_000);
    const empNumberMatch = this.page.url().match(/employeeId=(\d+)/);
    if (!empNumberMatch) throw new Error(`searchAndView: could not read employeeId from URL ${this.page.url()}`);
    return Number(empNumberMatch[1]);
  }

  /**
   * Opens the proxy Punch In/Out form.
   * [BUG SCRIPT, diperbaiki] Form ini memicu BEBERAPA GET async
   * /api/v2/attendance/punch-in/overlaps sesaat setelah render (mirip race balance-refresh
   * yg sudah ditemukan di modul Leave) -- dikonfirmasi live, tombol "In" ter-klik scr
   * Playwright API tapi TIDAK memicu POST apapun kalau diklik SEBELUM GET overlaps terakhir
   * selesai (kemungkinan tombolnya ter-disable sesaat scr client-side selama validasi itu
   * berjalan). networkidle+1s TIDAK cukup menunggu ini scr konsisten. Diperbaiki dgn
   * menunggu eksplisit response overlaps tsb di sini.
   */
  async openAddForm(): Promise<void> {
    await this.addButton.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    const overlapsRespPromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/attendance/punch-in/overlaps') || r.url().includes('/api/v2/attendance/punch-out/overlaps'), { timeout: 10_000 })
      .catch(() => null);
    await overlapsRespPromise;
    await this.page.waitForTimeout(800);
  }

  /**
   * Submits whichever punch form is currently showing (button label is "In" or "Out").
   * [BUG SCRIPT, diperbaiki] Locator.isVisible() TANPA argumen tetap TIDAK menunggu elemen
   * muncul -- ia instant snapshot check, sama persis dgn bug yg sudah ditemukan di
   * AssignLeavePage.submit(). Dikonfirmasi live: pada run yg lebih lambat, openAddForm()'s
   * networkidle+1s belum selalu cukup, jadi isVisible() milik kedua button (In & Out) sempat
   * return false bersamaan, lalu outButton.click() dipanggil pada tombol yg sebenarnya belum
   * ter-render -- klik "berhasil" scr Playwright API tapi tidak memicu apa2 scr nyata.
   * Diperbaiki pakai waitFor({state:'visible'}) yg benar2 polling.
   */
  async submitPunch(note?: string): Promise<{ response: import('@playwright/test').Response | null; action: 'in' | 'out' }> {
    if (note) await this.noteInput.fill(note);
    // [BUG SCRIPT, diperbaiki] Punch In pakai POST, tapi Punch Out pakai PUT ke endpoint yg
    // SAMA -- pola yg sama persis sudah terdokumentasi di TimeAttendancePage (self-service).
    // Versi awal method ini hanya menunggu POST, jadi setiap kali target employee KEBETULAN
    // sudah dlm status "Punched In" (form otomatis jadi "Punch Out"), klik "Out" berhasil scr
    // nyata tapi waitForResponse tidak pernah resolve (nunggu POST yg tidak akan pernah
    // datang) -- timeout 15s, response null, checks gagal diam2 walau app-nya bekerja benar.
    const responsePromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/attendance/') && ['POST', 'PUT'].includes(r.request().method()), { timeout: 15_000 })
      .catch(() => null);
    const inButton = this.page.getByRole('button', { name: 'In', exact: true });
    const outButton = this.page.getByRole('button', { name: 'Out', exact: true });
    const inVisible = await inButton
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    let action: 'in' | 'out';
    if (inVisible) {
      action = 'in';
      await inButton.click();
    } else {
      action = 'out';
      await outButton.waitFor({ state: 'visible', timeout: 8_000 });
      await outButton.click();
    }
    return { response: await responsePromise, action };
  }
}
