import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class OptionalFieldsPage extends BasePage {
  readonly nickNameSmokerMilitaryToggle: Locator;
  readonly ssnToggle: Locator;
  readonly sinToggle: Locator;
  readonly usTaxExemptionsToggle: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    const toggleByLabel = (label: string) =>
      page.locator('.orangehrm-optional-field-row', { has: page.getByText(label, { exact: true }) });
    this.nickNameSmokerMilitaryToggle = toggleByLabel(
      'Show Nick Name, Smoker and Military Service in Personal Details',
    );
    this.ssnToggle = toggleByLabel('Show SSN field in Personal Details');
    this.sinToggle = toggleByLabel('Show SIN field in Personal Details');
    this.usTaxExemptionsToggle = toggleByLabel('Show US Tax Exemptions menu');
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/configurePim');
  }

  /**
   * The real checkbox input is visually hidden behind the switch span, same
   * pattern as other OXD toggles in this suite. Clicking the outer
   * `.oxd-switch-wrapper` does NOT toggle the input (confirmed live);
   * `.oxd-switch-input` span itself must be clicked. The click occasionally
   * lands before Vue finishes attaching its handler right after the row
   * becomes visible (confirmed live: isChecked() unchanged after a single
   * click in that case), so this retries until the checked state flips.
   */
  async toggle(row: Locator): Promise<void> {
    const input = row.locator('input[type="checkbox"]');
    const span = row.locator('.oxd-switch-input');
    const before = await input.isChecked();
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await span.click();
      if ((await input.isChecked()) !== before) return;
      await this.page.waitForTimeout(300);
    }
  }

  async isChecked(row: Locator): Promise<boolean> {
    return row.locator('input[type="checkbox"]').isChecked();
  }

  /** Waits for the PUT /api/v2/pim/optional-field response so a reload right after Save doesn't race the write. */
  async save(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/api/v2/pim/optional-field') && r.request().method() === 'PUT',
        { timeout: 10_000 },
      ),
      this.saveButton.click(),
    ]);
  }
}
