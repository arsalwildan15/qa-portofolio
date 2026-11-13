import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Leave > Apply. Confirmed live: without any Leave Type carrying a non-zero balance for the
 * logged-in employee, the page renders "No Leave Types with Leave Balance" instead of the
 * form -- an entitlement must be assigned first via LeaveEntitlementPage.
 *
 * [TEMUAN] Submitting a multi-day range that spans a weekend auto-splits into one record
 * PER CALENDAR DAY server-side; weekend days get status "Weekend" (0 hours, not deducted
 * from balance), confirmed via the per-day breakdown on the Leave Request Details page
 * (viewLeaveRequest/<id>). Balance is deducted at APPLY time (while still "Pending
 * Approval"), not at approval time.
 */
export class ApplyLeavePage extends BasePage {
  readonly leaveTypeSelect: Locator;
  readonly leaveBalanceText: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly commentsInput: Locator;
  readonly applyButton: Locator;
  readonly fieldErrors: Locator;
  readonly noLeaveTypesMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.leaveTypeSelect = page.locator('.oxd-select-text').first();
    this.leaveBalanceText = page.getByText(/Day\(s\)/);
    this.fromDateInput = page.locator('input[placeholder="yyyy-dd-mm"]').first();
    this.toDateInput = page.locator('input[placeholder="yyyy-dd-mm"]').last();
    this.commentsInput = page.locator('textarea');
    this.applyButton = page.getByRole('button', { name: 'Apply' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.noLeaveTypesMessage = page.getByText('No Leave Types with Leave Balance');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/leave/applyLeave');
  }

  /**
   * Selecting a Leave Type triggers an async fetch of that type's current balance (the
   * "Leave Balance" panel updates a moment after the click, not synchronously) -- waits for
   * that GET to settle so a balance read immediately afterward isn't a stale "0.00 Day(s)"
   * from before the type was selected (confirmed live as a real race, not a flaky guess).
   */
  async selectLeaveType(leaveTypeName: string): Promise<void> {
    await this.leaveTypeSelect.click();
    const option = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .filter({ hasText: leaveTypeName });
    await option.first().waitFor({ state: 'visible', timeout: 5_000 });
    const responsePromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/leave/employees') && r.request().method() === 'GET', {
        timeout: 8_000,
      })
      .catch(() => null);
    await option.first().click();
    await responsePromise;
    await this.page.waitForTimeout(300);
  }

  /** date format is yyyy-dd-mm, matching this app's convention everywhere else. Clears first: a bare .fill() on this input APPENDS instead of replacing (confirmed live), a script bug to avoid. */
  async fillDateRange(fromDate: string, toDate: string): Promise<void> {
    await this.fromDateInput.fill('');
    await this.fromDateInput.fill(fromDate);
    await this.toDateInput.fill('');
    await this.toDateInput.fill(toDate);
  }

  async fillComments(text: string): Promise<void> {
    await this.commentsInput.fill(text);
  }

  /**
   * Returns the POST response, plus whatever error toast text (if any) was visible right
   * after clicking -- so a failed submit() self-reports WHY (e.g. "Leave Balance Exceeded")
   * instead of just leaving `response` undefined with no further clue. Confirmed live this
   * toast is the ONLY surfaced reason for several distinct rejection causes (insufficient
   * balance, overlapping request, etc.) that otherwise all look identical from the outside.
   */
  /**
   * Queries the SAME real-time balance endpoint the app itself calls on Apply (confirmed
   * live via network trace: GET /api/v2/leave/leave-balance/leave-type/<id>?fromDate=...
   * &toDate=...&duration[type]=full_day), scoped to one specific date. Returns the
   * available `balance` figure and whether the server itself flags that date as a weekend
   * -- both checked BEFORE clicking Apply, since the static "Leave Balance" panel shown on
   * page load does not reflect per-date availability and a stale/high-looking figure there
   * does not guarantee this specific date will be accepted (confirmed live: a date backed
   * by hundreds of days of displayed balance can still be rejected with "Leave Balance
   * Exceeded" for reasons not visible from that panel alone).
   *
   * [BUG SCRIPT, diperbaiki] `date` comes in as yyyy-dd-mm (this app's own UI/form
   * convention, matching `fromDateInput`/`toDateInput`). This particular API endpoint,
   * unlike the UI, expects REAL ISO yyyy-mm-dd -- confirmed live: a yyyy-dd-mm string with
   * day > 12 (so it can't double as a month number) gets a flat 422 "Invalid Parameter",
   * while day <= 12 silently "succeeds" but queries the WRONG, transposed date. An earlier
   * version of this method passed `date` straight through without converting, causing the
   * self-healing retry loop above it to exhaust all attempts and report "no valid date
   * found" roughly as often as it succeeded.
   */
  async getRealTimeBalanceFor(leaveTypeId: number, date: string): Promise<{ balance: number; isWeekend: boolean }> {
    const [yyyy, dd, mm] = date.split('-');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const resp = await this.page.request.get(
      `/web/index.php/api/v2/leave/leave-balance/leave-type/${leaveTypeId}?fromDate=${isoDate}&toDate=${isoDate}&duration%5Btype%5D=full_day`,
    );
    const body = await resp.json().catch(() => null);
    const breakdown = body?.data?.breakdown?.[0];
    const balance = breakdown?.balance?.balance ?? 0;
    const isWeekend = breakdown?.leaves?.[0]?.status?.name === 'Weekend';
    return { balance, isWeekend };
  }

  async submit(): Promise<{ response: import('@playwright/test').Response | null; errorToastText: string | null }> {
    const responsePromise = this.page
      .waitForResponse(
        (r) => r.url().includes('/api/v2/leave/leave-requests') && r.request().method() === 'POST',
        { timeout: 25_000 },
      )
      .catch(() => null);
    await this.applyButton.click();
    // Defensive: the app pre-checks overlap/balance via GET before the real POST fires
    // (confirmed live: GET /api/v2/leave/overlap-leaves + GET .../leave-balance/leave-type/N
    // run first), and a prior isolated run surfaced a real but hard-to-reproduce confirm
    // dialog here. If one appears, confirm it rather than silently timing out.
    const dialog = this.page.locator('.oxd-dialog-container, [role="dialog"]');
    if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await dialog.getByRole('button', { name: /^(ok|yes|proceed|confirm)/i }).first().click().catch(() => {});
    }
    const response = await responsePromise;
    let errorToastText: string | null = null;
    if (!response || response.status() >= 400) {
      errorToastText = await this.page
        .locator('.oxd-toast-content, .oxd-text--toast-message')
        .first()
        .textContent({ timeout: 3_000 })
        .catch(() => null);
    }
    return { response, errorToastText };
  }
}
