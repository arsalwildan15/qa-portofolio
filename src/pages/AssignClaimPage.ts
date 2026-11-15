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
  readonly addExpenseButton: Locator;
  readonly expenseRows: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.eventSelect = page.locator('.oxd-select-text').first();
    this.currencySelect = page.locator('.oxd-select-text').nth(1);
    this.remarksInput = page.locator('textarea');
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    // The "Add Expense" button on the claim detail page -- confirmed live, this page has TWO
    // "Add" buttons (Expenses section, Attachments section); the Expenses one is first.
    this.addExpenseButton = page.getByRole('button', { name: 'Add' }).first();
    this.expenseRows = page.locator('.oxd-table-body .oxd-table-row, .oxd-table-card').filter({ hasNot: page.getByText('No Records Found') });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/claim/assignClaim');
  }

  /**
   * Retries once on net::ERR_ABORTED -- same race seen across this suite's other goto()s:
   * calling this right after create()'s own save can collide with the form's delayed
   * self-redirect (confirmed live here too).
   */
  async gotoDetail(claimId: number): Promise<void> {
    try {
      await this.page.goto(`/web/index.php/claim/assignClaim/id/${claimId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('ERR_ABORTED')) {
        await this.page.waitForTimeout(1_500);
        await this.page.goto(`/web/index.php/claim/assignClaim/id/${claimId}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Opens the "Add Expense" dialog, fills Expense Type / Date / Amount / Note and saves.
   * Confirmed live via HTML dump: the dialog has exactly 2 plain <input> elements (Date then
   * Amount, in that DOM order) plus a <textarea> for Note -- Amount has no distinguishing
   * placeholder/name attribute, so it must be addressed positionally.
   */
  async addExpense(expenseTypeName: string, date: string, amount: string, note: string): Promise<import('@playwright/test').Response | null> {
    await this.addExpenseButton.click();
    const dialog = this.page.locator('.oxd-dialog-container, [role="dialog"]').last();
    await dialog.locator('.oxd-select-text').click();
    const option = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .filter({ hasText: expenseTypeName });
    await option.first().waitFor({ state: 'visible', timeout: 5_000 });
    await option.first().click();

    const inputs = dialog.locator('input');
    await inputs.nth(0).fill('');
    await inputs.nth(0).fill(date);
    await inputs.nth(1).fill(amount);
    await dialog.locator('textarea').fill(note);

    const responsePromise = this.page
      .waitForResponse((r) => /\/api\/v2\/claim\/requests\/\d+\/expenses/.test(r.url()) && r.request().method() === 'POST', { timeout: 10_000 })
      .catch(() => null);
    await dialog.getByRole('button', { name: 'Save' }).click();
    return responsePromise;
  }

  /**
   * Opens the "Add Attachment" dialog (the SECOND "Add" button on the page, after Expenses'),
   * uploads the given local file with a comment, and saves. Confirmed live: client-side
   * extension check blocks a bare .php upload outright (no request fires at all), but does
   * NOT validate real file content/MIME against a renamed extension (a .php renamed to .jpg
   * uploads successfully, see TC-CLAIM-ASSIGN-10's finding).
   */
  async addAttachment(filePath: string, comment: string): Promise<import('@playwright/test').Response | null> {
    const addButtons = this.page.getByRole('button', { name: 'Add' });
    await addButtons.nth(1).click();
    await this.page.waitForTimeout(600);
    const dialog = this.page.locator('.oxd-dialog-container, [role="dialog"]').last();
    const fileInput = this.page.locator('input[type="file"]');
    const responsePromise = this.page
      .waitForResponse((r) => /\/api\/v2\/claim\/requests\/\d+\/attachments/.test(r.url()) && r.request().method() === 'POST', { timeout: 8_000 })
      .catch(() => null);
    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(400);
    await dialog.locator('textarea').fill(comment);
    await dialog.getByRole('button', { name: 'Save' }).click();
    return responsePromise;
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

  /**
   * Clicks an action button on the claim detail page (Admin: "Approve" / "Reject"; ESS: "Submit"
   * / "Cancel") and returns the PUT requests/<id>/action response. Confirmed live: Admin
   * "Approve" moves a SUBMITTED claim straight to PAID -- there is no separate Pay step.
   */
  async clickAction(buttonName: string): Promise<import('@playwright/test').Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => /\/api\/v2\/claim\/requests\/\d+\/action/.test(r.url()) && r.request().method() === 'PUT', { timeout: 15_000 })
      .catch(() => null);
    await this.page.getByRole('button', { name: buttonName, exact: true }).click();
    return responsePromise;
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
