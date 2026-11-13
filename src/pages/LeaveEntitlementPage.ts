import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Leave > Entitlements > Add Entitlements. Confirmed live: this form is an UPSERT, not a
 * pure insert -- if the employee already has an entitlement row for the same Leave Type +
 * Leave Period, Save opens a "Confirm Leave Assignment"-style dialog
 * ("Existing Entitlement value X will be updated to Y") that must be explicitly confirmed,
 * otherwise nothing is saved.
 */
export class LeaveEntitlementPage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly leaveTypeSelect: Locator;
  readonly entitlementInput: Locator;
  readonly saveButton: Locator;
  readonly confirmButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.leaveTypeSelect = page.locator('.oxd-select-text').first();
    this.entitlementInput = page
      .locator('.oxd-input-group', { has: page.getByText('Entitlement', { exact: true }) })
      .locator('input');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.confirmButton = page.getByRole('button', { name: 'Confirm' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/leave/addLeaveEntitlement');
  }

  /**
   * Autocomplete employee search, same async-search pattern used across the suite (Admin
   * Users, Recruitment Hiring Manager). Falls back to just the first word of `searchTerm`
   * if the full string finds nothing -- this component's search appears to match on a
   * single name token rather than a free-text substring across the full display name
   * (confirmed live: searching a full "First Last" display name sometimes returns "No
   * Records Found" while the first word alone matches).
   */
  async selectEmployee(searchTerm: string): Promise<string> {
    const trySearch = async (term: string) => {
      await this.employeeNameInput.fill('');
      await this.employeeNameInput.fill(term);
      await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
      await this.page.waitForTimeout(600);
      return this.page.locator('.oxd-autocomplete-option');
    };

    let options = await trySearch(searchTerm);
    if ((await options.count()) === 0 || (await options.first().textContent()) === 'No Records Found') {
      const firstWord = searchTerm.split(' ')[0] ?? searchTerm;
      options = await trySearch(firstWord);
    }
    const option = options.first();
    await option.waitFor({ state: 'visible', timeout: 5_000 });
    const name = (await option.textContent()) ?? '';
    await option.click();
    return name;
  }

  async selectLeaveType(leaveTypeName: string): Promise<void> {
    await this.leaveTypeSelect.click();
    const option = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .filter({ hasText: leaveTypeName });
    await option.first().waitFor({ state: 'visible', timeout: 5_000 });
    await option.first().click();
  }

  async fillEntitlement(days: string): Promise<void> {
    await this.entitlementInput.fill(days);
  }

  /**
   * Saves the form and, if an "already exists" confirmation dialog appears (upsert case),
   * confirms it. Returns the POST /api/v2/leave/leave-entitlements response.
   */
  async save() {
    const responsePromise = this.page
      .waitForResponse(
        (r) => r.url().includes('/api/v2/leave/leave-entitlements') && r.request().method() === 'POST',
        { timeout: 25_000 },
      )
      .catch(() => null);
    await this.saveButton.click();
    await this.page.waitForTimeout(600);
    if (await this.confirmButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await this.confirmButton.click();
    }
    return responsePromise;
  }
}
