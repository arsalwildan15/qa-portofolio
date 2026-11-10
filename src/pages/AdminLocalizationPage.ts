import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Configuration > Localization. Confirmed live: /admin/localization.
 *
 * Fields (confirmed live): Language (select dropdown, current demo value
 * "English (United States)") and Date Format (select dropdown, current
 * demo value "yyyy-dd-mm"). [TEMUAN PENTING] NO Timezone field exists on
 * this screen -- contrary to the initial scoping assumption ("default
 * language/date format/timezone, etc."), confirmed live via full form-text
 * dump: only these 2 selects plus a Save button. No Cancel button either
 * (same quirk as General Information).
 *
 * [SAFETY CONSTRAINT -- PENTING] Changing the default Language or Date
 * Format here changes the UI language/date rendering for EVERY user of
 * this shared public demo (both fields are select-only, so there is no
 * free-text injection surface to probe anyway). This suite's TCs never
 * click Save on this screen -- only client-side dropdown interaction
 * (open/select without saving) is exercised, then reverted by simply
 * navigating away/reloading without saving.
 */
export class AdminLocalizationPage extends BasePage {
  readonly languageSelect: Locator;
  readonly dateFormatSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    const bySelect = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('.oxd-select-text');
    this.languageSelect = bySelect('Language');
    this.dateFormatSelect = bySelect('Date Format');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }

  /**
   * Waits for the underlying GET to resolve before returning -- same
   * hydration-race guard as AdminGeneralInformationPage.goto() /
   * AdminEmailConfigurationPage.goto(): reading `languageSelect`/
   * `dateFormatSelect` immediately after a blind goto() was confirmed
   * live to race Vue's hydration and misread "-- Select --" even though
   * the server's real value ("English (United States)" on this demo) was
   * correct the whole time.
   */
  async goto(): Promise<void> {
    const getPromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/admin/localization') && r.request().method() === 'GET', {
        timeout: 10_000,
      })
      .catch(() => null);
    await this.page.goto('/web/index.php/admin/localization');
    await getPromise;
    await this.page.waitForTimeout(500);
  }

  async openLanguageOptions(): Promise<void> {
    await this.languageSelect.click();
  }

  async openDateFormatOptions(): Promise<void> {
    await this.dateFormatSelect.click();
  }
}
