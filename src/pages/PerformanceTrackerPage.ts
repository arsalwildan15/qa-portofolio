import { expect, type Page, type Locator, type Response } from '@playwright/test';
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

  rowFor(trackerName: string): Locator {
    return this.tableRows.filter({ hasText: trackerName });
  }

  /** Pencil icon -> performance/addPerformanceTracker/<id> (same form, prefilled). Confirmed live. */
  async clickEdit(trackerName: string): Promise<void> {
    await this.rowFor(trackerName).first().locator('.bi-pencil-fill').click();
    await expect(this.trackerNameInput).not.toHaveValue('', { timeout: 15_000 });
  }

  /** Save on the edit form = PUT config/trackers/<id> {trackerName, empNumber, reviewerEmpNumbers}. */
  async saveEdit(trackerId: number): Promise<Response | null> {
    const resp = this.page
      .waitForResponse((r) => r.url().includes(`/api/v2/performance/config/trackers/${trackerId}`) && r.request().method() === 'PUT', { timeout: 15_000 })
      .catch(() => null);
    await this.saveButton.click();
    return resp;
  }

  /** Trash icon -> "Are you Sure?" dialog -> "Yes, Delete" = DELETE config/trackers {ids}. */
  async deleteRow(trackerName: string): Promise<Response | null> {
    await this.rowFor(trackerName).first().locator('.bi-trash').click();
    const dialog = this.page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 10_000 });
    const resp = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/performance/config/trackers') && r.request().method() === 'DELETE', { timeout: 15_000 })
      .catch(() => null);
    await dialog.getByRole('button', { name: /Yes, Delete/ }).click();
    return resp;
  }

  /**
   * Tracker log page: performance/addPerformanceTrackerLog/trackId/<id> (reviewer view) or with
   * ?mode=my (the tracked employee's own view). Both show "Add Log"; the dialog has one text input
   * (Log), one textarea (Comment), Positive / Negative toggles, Save = POST trackers/<id>/logs
   * {log, comment, achievement: 1 (Positive) | 2 (Negative)}. Confirmed live 2026-11-15.
   */
  async gotoLogs(trackerId: number, mode?: 'my'): Promise<void> {
    await this.page.goto(`/web/index.php/performance/addPerformanceTrackerLog/trackId/${trackerId}${mode ? `?mode=${mode}` : ''}`);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async addLog(trackerId: number, logText: string, comment: string, achievement: 'Positive' | 'Negative'): Promise<Response | null> {
    await this.page.getByRole('button', { name: 'Add Log' }).click();
    const dialog = this.page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 10_000 });
    await dialog.locator('input').first().fill(logText);
    await dialog.locator('textarea').first().fill(comment);
    await dialog.getByRole('button', { name: achievement }).click();
    const resp = this.page
      .waitForResponse((r) => r.url().includes(`/api/v2/performance/trackers/${trackerId}/logs`) && r.request().method() === 'POST', { timeout: 15_000 })
      .catch(() => null);
    await dialog.getByRole('button', { name: 'Save' }).click();
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
