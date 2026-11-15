import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Performance > Configure > KPIs. A simple CRUD list (Key Performance Indicator, Job Title, Min/Max Rating, Default Scale toggle). */
export class PerformanceKpiPage extends BasePage {
  readonly addButton: Locator;
  readonly kpiNameInput: Locator;
  readonly jobTitleSelect: Locator;
  readonly minRatingInput: Locator;
  readonly maxRatingInput: Locator;
  readonly saveButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  /** "Make Default Scale" toggle on the Add KPI form. Confirmed live: not mutually-exclusive at
   * the UI/validation level -- saving a 2nd KPI as default for the SAME Job Title is accepted
   * (200) and silently un-defaults the previous one (only one row shows "Yes" afterward). */
  readonly defaultScaleToggle: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.kpiNameInput = page.locator('.oxd-input-group', { has: page.getByText('Key Performance Indicator', { exact: true }) }).locator('input');
    this.jobTitleSelect = page.locator('.oxd-select-text').first();
    this.minRatingInput = page.locator('.oxd-input-group', { has: page.getByText('Minimum Rating', { exact: true }) }).locator('input');
    this.maxRatingInput = page.locator('.oxd-input-group', { has: page.getByText('Maximum Rating', { exact: true }) }).locator('input');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.defaultScaleToggle = page.locator('.oxd-switch-input');
    this.searchButton = page.getByRole('button', { name: 'Search' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/performance/searchKpi');
  }

  async gotoAdd(): Promise<void> {
    await this.page.goto('/web/index.php/performance/searchKpi');
    await this.addButton.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async selectJobTitle(jobTitleName: string): Promise<void> {
    await this.jobTitleSelect.click();
    const option = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .filter({ hasText: jobTitleName });
    await option.first().waitFor({ state: 'visible', timeout: 5_000 });
    await option.first().click();
  }

  async save(): Promise<import('@playwright/test').Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/performance/kpis') && r.request().method() === 'POST', { timeout: 10_000 })
      .catch(() => null);
    await this.saveButton.click();
    return responsePromise;
  }
}
