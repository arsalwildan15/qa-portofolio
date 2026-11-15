import { type Page, type Locator, type Response } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Performance > Configure > Trackers -- a per-employee performance journal, NOT KPI/review
 * configuration (confirmed live). Add form: Tracker Name, Employee Name (autocomplete),
 * Reviewers (autocomplete). Save = POST /api/v2/performance/config/trackers
 * {trackerName, empNumber, reviewerEmpNumbers}. Rows carry bi-trash / bi-pencil-fill icons.
 */
export class PerformanceTrackerPage extends BasePage {
  readonly trackerNameInput: Locator;
  readonly hintInputs: Locator;
  readonly saveButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.trackerNameInput = page.locator('.oxd-input-group', { has: page.getByText('Tracker Name', { exact: true }) }).locator('input');
    this.hintInputs = page.getByPlaceholder('Type for hints...');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.fieldErrors = page.locator('.oxd-input-field-error-message');
    this.tableRows = page.locator('.oxd-table-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/performance/viewPerformanceTracker');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async gotoAdd(): Promise<void> {
    await this.page.goto('/web/index.php/performance/addPerformanceTracker');
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.trackerNameInput.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Picks the option containing `optionMustContain` (the employee's unique last name) -- an
   * id search can surface other employees whose names contain the same digits. */
  async selectEmployee(searchTerm: string, optionMustContain: string): Promise<void> {
    await this.pickOption(this.hintInputs.nth(0), searchTerm, optionMustContain);
  }

  async selectReviewer(searchTerm: string): Promise<void> {
    await this.pickOption(this.hintInputs.nth(1), searchTerm);
  }

  async save(): Promise<Response | null> {
    const resp = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/performance/config/trackers') && r.request().method() === 'POST', { timeout: 10_000 })
      .catch(() => null);
    await this.saveButton.click();
    return resp;
  }

  private async pickOption(input: Locator, searchTerm: string, optionMustContain?: string): Promise<void> {
    await input.fill(searchTerm);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    const options = this.page.locator('.oxd-autocomplete-option');
    const option = (optionMustContain ? options.filter({ hasText: optionMustContain }) : options).first();
    await option.waitFor({ state: 'visible', timeout: 10_000 });
    await option.click();
  }
}
