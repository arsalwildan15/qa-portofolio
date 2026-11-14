import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Claim > Employee Claims > Assign Claim. Creates a new claim request for an employee (Event + Currency + optional Remarks), landing as "Initiated". */
export class AssignClaimPage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly eventSelect: Locator;
  readonly currencySelect: Locator;
  readonly remarksInput: Locator;
  readonly createButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.eventSelect = page.locator('.oxd-select-text').first();
    this.currencySelect = page.locator('.oxd-select-text').nth(1);
    this.remarksInput = page.locator('textarea');
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/claim/assignClaim');
  }

  async selectEmployee(searchTerm: string): Promise<void> {
    await this.employeeNameInput.fill(searchTerm);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    const option = this.page.locator('.oxd-autocomplete-option').first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  async selectEvent(eventName: string): Promise<void> {
    await this.eventSelect.click();
    const option = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .filter({ hasText: eventName });
    await option.first().waitFor({ state: 'visible', timeout: 5_000 });
    await option.first().click();
  }

  /** Selects a currency by position (1-indexed, excluding "-- Select --") rather than exact name -- currency names are locale data, not stable to hardcode. */
  async selectCurrencyByIndex(index: number): Promise<void> {
    await this.currencySelect.click();
    const options = this.page.locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]');
    await options.nth(index).waitFor({ state: 'visible', timeout: 5_000 });
    await options.nth(index).click();
  }

  /** Confirmed live: POST goes to /api/v2/claim/employees/<empNumber>/requests, not a flat "employee-claims" collection. */
  async create(): Promise<import('@playwright/test').Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => /\/api\/v2\/claim\/employees\/\d+\/requests/.test(r.url()) && r.request().method() === 'POST', { timeout: 15_000 })
      .catch(() => null);
    await this.createButton.click();
    return responsePromise;
  }
}
