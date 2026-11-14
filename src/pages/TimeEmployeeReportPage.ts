import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Time > Reports > Employee Reports. Shows total hours logged by an employee per
 * Project/Activity within a date range -- confirmed live, this reads back exactly what My
 * Timesheet's Save wrote (GET /api/v2/time/reports/data), making it a good end-to-end check
 * that logged hours are queryable, not just storable.
 */
export class TimeEmployeeReportPage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly viewButton: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...').first();
    this.fromDateInput = page.getByPlaceholder('From');
    this.toDateInput = page.getByPlaceholder('To');
    this.viewButton = page.getByRole('button', { name: 'View' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/time/displayEmployeeReportCriteria');
  }

  async selectEmployee(searchTerm: string): Promise<void> {
    await this.employeeNameInput.fill(searchTerm);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    const option = this.page.locator('.oxd-autocomplete-option').first();
    await option.waitFor({ state: 'visible', timeout: 10_000 });
    await option.click();
  }

  async fillDateRange(fromDate: string, toDate: string): Promise<void> {
    await this.fromDateInput.fill(fromDate);
    await this.toDateInput.fill(toDate);
  }

  async view(): Promise<import('@playwright/test').Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/time/reports/data') && r.request().method() === 'GET', { timeout: 15_000 })
      .catch(() => null);
    await this.viewButton.click();
    return responsePromise;
  }
}
