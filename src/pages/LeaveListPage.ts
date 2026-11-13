import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Leave > Leave List. Confirmed live: default filter has a sticky "Pending Approval" status
 * chip pre-applied -- clicking "Reset" does NOT clear it (resets other fields only), so a
 * search for a record in any other status (Scheduled, Taken, Rejected, Cancelled) returns
 * "No Records Found" unless that chip is explicitly removed or the Status dropdown is used.
 *
 * [TEMUAN -- dikonfirmasi via API, bukan dugaan UI] Response GET
 * /api/v2/leave/employees/leave-requests carries an `allowedActions` array per record,
 * reflecting what the CURRENT logged-in user is actually permitted to do with that specific
 * record server-side. With only the single "Admin" account available in this demo,
 * `allowedActions` is ALWAYS `[{"action":"CANCEL"}]` only, for both the admin's own
 * "Pending Approval" request and an admin-assigned-to-another-employee "Scheduled" one.
 * Approve/Reject is therefore NOT reachable for testing in this environment: it requires a
 * configured supervisor-subordinate relationship this demo's single test account doesn't
 * have, not a missing locator. Documented as N/A, consistent with this project's established
 * pattern for role-gated features that need a second account this demo doesn't provide.
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

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/leave/viewLeaveList');
  }

  async selectEmployee(searchTerm: string): Promise<void> {
    await this.employeeNameInput.fill(searchTerm);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    await this.page.locator('.oxd-autocomplete-option').first().click();
  }

  /** Removes the sticky default "Pending Approval" status chip so other statuses can be searched. */
  async clearStatusChip(): Promise<void> {
    const chip = this.page.locator('.oxd-tag');
    if ((await chip.count()) > 0) {
      await chip.getByRole('button').first().click().catch(() => {});
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

  /** Opens the row's kebab menu and clicks "View Leave Details", landing on viewLeaveRequest/<id>. */
  async openDetails(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button, button:has(i.bi-three-dots-vertical)').first().click();
    await this.page.getByText('View Leave Details').click();
  }

  /** Opens the row's kebab menu and clicks "Cancel Leave". Confirms the resulting dialog. */
  async cancelLeave(row: Locator) {
    await row.locator('.oxd-table-cell-actions button, button:has(i.bi-three-dots-vertical)').first().click();
    await this.page.getByText('Cancel Leave').click();
    const responsePromise = this.page
      .waitForResponse(
        (r) => r.url().includes('/leave-requests') && r.request().method() !== 'GET',
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.page.getByRole('button', { name: /Yes/i }).click();
    return responsePromise;
  }
}
