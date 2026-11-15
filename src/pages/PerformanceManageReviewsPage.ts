import { type Page, type Locator, type Response } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Performance > Manage Reviews. Covers the search/filter list, the Add/Edit review form
 * (shared, same fields at the same `saveReview` URL), and row actions.
 *
 * Business rule confirmed live: "Supervisor Reviewer" only lists people already linked as the
 * target employee's supervisor via PIM > Report-to -- an employee with no supervisor shows
 * "No Records Found" there and Save is blocked client-side ("Invalid"). Likewise, Activate only
 * succeeds if the employee's Job Title has at least one KPI configured; otherwise the API
 * returns 400 "Cannot activate review for employees who doesn't have a Job Title with KPI".
 */
export class PerformanceManageReviewsPage extends BasePage {
  readonly addButton: Locator;
  readonly employeeNameFilterInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly tableRows: Locator;
  readonly fieldErrors: Locator;

  // Add/Edit form (two "Type for hints..." autocompletes: Employee Name, then Supervisor Reviewer)
  readonly hintInputs: Locator;
  readonly dateInputs: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;
  readonly activateButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.employeeNameFilterInput = page.locator('.oxd-input-group', { has: page.getByText('Employee Name', { exact: true }) }).locator('input');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.tableRows = page.locator('.oxd-table-card');
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');

    this.hintInputs = page.getByPlaceholder('Type for hints...');
    // The site-wide date placeholder has been observed to flip between "yyyy-dd-mm" and
    // "yyyy-mm-dd" (Admin > Localization date format) across sessions on the shared public
    // demo -- same drift pattern as the already-documented identity-corruption resets. Match
    // both so this page object doesn't break when it flips again.
    this.dateInputs = page.locator('input[placeholder="yyyy-dd-mm"], input[placeholder="yyyy-mm-dd"]');
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.activateButton = page.getByRole('button', { name: 'Activate' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/performance/searchPerformanceReview');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async gotoAdd(): Promise<void> {
    await this.goto();
    await this.addButton.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async gotoEdit(reviewId: number): Promise<void> {
    await this.page.goto(`/web/index.php/performance/saveReview/${reviewId}`);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /** Fills Employee Name autocomplete and picks the first (and normally only) matching option. */
  async selectEmployee(searchTerm: string): Promise<void> {
    await this.hintInputs.nth(0).fill(searchTerm);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await this.page.locator('.oxd-autocomplete-option').first().waitFor({ state: 'visible', timeout: 10_000 });
    await this.page.locator('.oxd-autocomplete-option').first().click();
  }

  /**
   * Fills Supervisor Reviewer autocomplete. Returns the visible option texts BEFORE clicking so
   * callers can assert on "No Records Found" (employee has no supervisor link) without needing
   * a separate probe.
   */
  async selectSupervisorReviewer(searchTerm: string): Promise<string[]> {
    await this.hintInputs.nth(1).fill(searchTerm);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await this.page.waitForTimeout(400);
    const options = await this.page.locator('.oxd-autocomplete-option').allInnerTexts();
    if (options[0] !== 'No Records Found') {
      await this.page.locator('.oxd-autocomplete-option').first().click();
    }
    return options;
  }

  async fillReviewPeriod(startDate: string, endDate: string, dueDate: string): Promise<void> {
    await this.dateInputs.nth(0).fill(startDate);
    await this.dateInputs.nth(1).fill(endDate);
    await this.dateInputs.nth(2).fill(dueDate);
    await this.page.keyboard.press('Escape');
  }

  async save(): Promise<Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/performance/manage/reviews') && r.request().method() === 'POST', { timeout: 10_000 })
      .catch(() => null);
    await this.saveButton.click();
    return responsePromise;
  }

  /** Clicks Activate on the Edit-review form. Returns the PUT response (status 400 if the employee's Job Title has no KPI). */
  async activate(reviewId: number): Promise<Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => r.url().includes(`/api/v2/performance/manage/reviews/${reviewId}`) && r.request().method() === 'PUT', { timeout: 10_000 })
      .catch(() => null);
    await this.activateButton.click();
    return responsePromise;
  }

  /**
   * The list's "Employee Name" filter is the SAME autocomplete widget as the Add Review form's
   * Employee Name field (confirmed live) -- typing text alone does not bind the filter value,
   * a suggestion must be selected, or Search silently runs with no name filter applied at all
   * (returns every review in the system).
   */
  async searchByEmployeeName(name: string): Promise<void> {
    await this.employeeNameFilterInput.fill(name);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    const option = this.page.locator('.oxd-autocomplete-option').first();
    if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await option.click();
    }
    await this.searchButton.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  rowFor(matchText: string): Locator {
    return this.tableRows.filter({ hasText: matchText }).first();
  }

  async clickEdit(row: Locator): Promise<void> {
    await row.locator('button[title="Edit"]').click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async clickEvaluate(row: Locator): Promise<void> {
    await row.locator('button[title="Evaluate"]').click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  /** Opens the delete-confirm dialog for a row; caller then confirms or cancels. */
  async clickDelete(row: Locator): Promise<void> {
    await row.locator('button').first().click();
  }

  confirmDeleteDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * Clicks "Yes, Delete" on the open confirm dialog. The actual call is
   * `DELETE /api/v2/performance/manage/reviews` with NO id in the URL path (confirmed live --
   * the id travels in the request body, not as a path segment like most other delete endpoints
   * in this app).
   */
  async confirmDelete(): Promise<Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/performance/manage/reviews') && r.request().method() === 'DELETE', { timeout: 10_000 })
      .catch(() => null);
    await this.confirmDeleteDialog().getByRole('button', { name: 'Yes, Delete' }).click();
    return responsePromise;
  }
}
