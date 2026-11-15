import { type Page, type Locator, type Response } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Claim > Configuration > Events (confirmed live): list claim/viewEvents, add form
 * claim/saveEvents (Event Name required, Description, Active toggle on by default);
 * Save = POST /api/v2/claim/events {name, description, status}.
 */
export class ClaimEventsPage extends BasePage {
  readonly eventNameInput: Locator;
  readonly activeToggle: Locator;
  readonly saveButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.eventNameInput = page.locator('.oxd-input-group', { has: page.getByText('Event Name', { exact: true }) }).locator('input');
    this.activeToggle = page.locator('.oxd-switch-input');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.fieldErrors = page.locator('.oxd-input-field-error-message');
    this.tableRows = page.locator('.oxd-table-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/claim/viewEvents');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async gotoAdd(): Promise<void> {
    await this.page.goto('/web/index.php/claim/saveEvents');
    await this.eventNameInput.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async save(): Promise<Response | null> {
    const resp = this.page
      .waitForResponse((r) => /\/api\/v2\/claim\/events$/.test(r.url()) && r.request().method() === 'POST', { timeout: 10_000 })
      .catch(() => null);
    await this.saveButton.click();
    return resp;
  }
}
