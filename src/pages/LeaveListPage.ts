import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { DATE_INPUT_SELECTOR, type DateFormat } from '../utils/dateInput';
import { isVisibleWithWait } from '../utils/testReport';

/**
 * Leave > Leave List. Confirmed live: default filter has a sticky "Pending Approval" status
 * chip pre-applied -- clicking "Reset" does NOT clear it (resets other fields only), so a
 * search for a record in any other status (Scheduled, Taken, Rejected, Cancelled) returns
 * "No Records Found" unless that chip is explicitly removed or the Status dropdown is used.
 *
 * Response GET /api/v2/leave/employees/leave-requests carries an `allowedActions` array per
 * record (what the CURRENT user may do server-side). [KOREKSI 2026-11-15, menggantikan klaim
 * "Approve/Reject N/A" lama -- R4] The old N/A came from only testing the Admin's OWN request and
 * an Admin-ASSIGNED one (lands Scheduled). For a "Pending Approval" request APPLIED BY an ESS
 * account (createEssAccount + loginAs, Fase 1), the Admin row DOES show Approve / Reject and
 * they work: PUT /api/v2/leave/employees/leave-requests/<id> {action: APPROVE|REJECT}.
 */
export class LeaveListPage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly statusSelect: Locator;
  readonly leaveTypeSelect: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly tableRows: Locator;
  readonly noRecordsFound: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.statusSelect = page.locator('.oxd-select-text').nth(0);
    this.leaveTypeSelect = page.locator('.oxd-select-text').nth(1);
    this.fromDateInput = page.locator('input[type="date"]').first();
    this.toDateInput = page.locator('input[type="date"]').last();
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.tableRows = page.locator('.oxd-table-card');
    this.noRecordsFound = page.getByText('No Records Found');
  }

  /**
   * Retries once on net::ERR_ABORTED -- same race documented on ApplyLeavePage.goto() and
   * AssignLeavePage.goto(): calling this right after a prior page's own save()/submit() can
   * collide with that page's delayed self-redirect.
   */
  async goto(): Promise<void> {
    try {
      await this.page.goto('/web/index.php/leave/viewLeaveList');
    } catch (error) {
      if (error instanceof Error && error.message.includes('ERR_ABORTED')) {
        await this.page.waitForTimeout(1_500);
        await this.page.goto('/web/index.php/leave/viewLeaveList');
      } else {
        throw error;
      }
    }
  }

  async selectEmployee(searchTerm: string): Promise<void> {
    await this.employeeNameInput.fill(searchTerm);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    const option = this.page.locator('.oxd-autocomplete-option').first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  /** Removes the sticky default "Pending Approval" status chip so other statuses can be searched. */
  async clearStatusChip(): Promise<void> {
    // [BUG SCRIPT, diperbaiki] Class chip multiselect yg BENAR adalah ".oxd-chip" (dgn child
    // icon "i.bi-x" sbg tombol hapus, bukan elemen <button>) -- dikonfirmasi live via dump
    // HTML form. Versi awal memakai ".oxd-tag" + getByRole('button'), yg tidak pernah match
    // apapun di DOM form ini, sehingga clear silently no-op dan chip "Pending Approval" tetap
    // melekat meski Status sudah diganti di dropdown.
    const chip = this.page.locator('.oxd-chip');
    if ((await chip.count()) > 0) {
      await chip.locator('i.bi-x').first().click().catch(() => {});
      await this.page.waitForTimeout(300);
    }
  }

  async selectStatus(statusName: string): Promise<void> {
    await this.statusSelect.click();
    await this.page.waitForTimeout(300);
    const option = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .filter({ hasText: statusName });
    await option.first().click();
  }

  async search(): Promise<void> {
    const responsePromise = this.page
      .waitForResponse(
        (r) => r.url().includes('/api/v2/leave/employees/leave-requests') && r.request().method() === 'GET',
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.searchButton.click();
    await responsePromise;
    await this.page.waitForTimeout(500);
  }

  rowByText(text: string): Locator {
    return this.tableRows.filter({ hasText: text });
  }

  /**
   * Rows showing `date` (given in `valueFormat`), converted to the format the list currently
   * DISPLAYS (read from the page's date-input placeholder -- it flips with Admin > Localization,
   * see dateInput.ts). Not a "match either ordering" regex: 2026-12-07 vs 2026-07-12 are
   * different days and would false-match.
   */
  async rowByDate(date: string, valueFormat: DateFormat): Promise<Locator> {
    const displayFormat = (await this.page.locator(DATE_INPUT_SELECTOR).first().getAttribute('placeholder').catch(() => null)) as DateFormat | null;
    const [yyyy, a, b] = date.split('-');
    const displayed = displayFormat && displayFormat !== valueFormat ? `${yyyy}-${b}-${a}` : date;
    return this.tableRows.filter({ hasText: displayed });
  }

  /** Clicks the row's inline Approve / Reject button; returns the PUT employees/leave-requests/<id> response. */
  async actOnRow(row: Locator, action: 'Approve' | 'Reject'): Promise<import('@playwright/test').Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => /\/api\/v2\/leave\/employees\/leave-requests\/\d+$/.test(r.url()) && r.request().method() === 'PUT', { timeout: 15_000 })
      .catch(() => null);
    await row.getByRole('button', { name: action, exact: true }).click();
    return responsePromise;
  }

  /** Opens the row's kebab menu and clicks "View Leave Details", landing on viewLeaveRequest/<id>. */
  async openDetails(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button, button:has(i.bi-three-dots-vertical)').first().click();
    await this.page.getByText('View Leave Details').click();
  }

  /**
   * Opens the row's kebab menu and clicks "Cancel Leave".
   *
   * [BUG SCRIPT, diperbaiki] Versi awal mengasumsikan SELALU ada dialog konfirmasi "Yes" yg
   * harus diklik -- dikonfirmasi live via dump body text: membatalkan request berstatus
   * "Pending Approval" TIDAK menampilkan dialog konfirmasi apapun, cukup langsung
   * menampilkan toast "Successfully Updated" seketika setelah klik "Cancel Leave". Versi ini
   * memasang listener response SEBELUM klik "Cancel Leave" (krn requestnya bisa langsung
   * terkirim tanpa dialog), lalu secara defensif tetap menangani dialog "Yes" JIKA ternyata
   * muncul (mis. utk status lain spt Scheduled yg belum pernah dicek).
   */
  async cancelLeave(row: Locator) {
    await row.locator('.oxd-table-cell-actions button, button:has(i.bi-three-dots-vertical)').first().click();
    const responsePromise = this.page
      .waitForResponse(
        (r) => r.url().includes('/leave-requests') && r.request().method() !== 'GET',
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.page.getByText('Cancel Leave').click();
    const yesButton = this.page.getByRole('button', { name: /Yes/i });
    if (await isVisibleWithWait(yesButton, 2_000)) {
      await yesButton.click();
    }
    return responsePromise;
  }
}
