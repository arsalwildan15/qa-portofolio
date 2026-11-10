import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Configuration > Language Packages. Confirmed live:
 * /admin/languagePackage.
 *
 * List: 9 language packages on this demo (e.g. "Chinese (Simplified,
 * China) - 中文（简体，中国）", "English (United States)", ...). Each row has a
 * bulk-select checkbox plus 4 action icons, confirmed live via innerHTML
 * in this exact order: [0] upload (import translation file), [1]
 * translate (bi-translate, manage translations), [2] download, [3] trash
 * (Delete, same "Yes, Delete" confirm dialog pattern as every other list
 * screen in this suite) -- NOT just 2 icons as might be assumed from
 * other simple-list screens.
 *
 * [TEMUAN PENTING] "Add" opens a dialog with a single "Name" select
 * (-- Select --, meant to list locales not yet added) + an informational
 * Note + Cancel/Save. On THIS demo, all 9 locales OrangeHRM ships are
 * ALREADY added, so the Add dialog's dropdown shows "No Records Found" --
 * there is currently NOTHING left to add. This suite's mutating TC
 * therefore exercises Delete-then-re-Add of an EXISTING package (which
 * frees up that one locale in the Add dropdown, then re-adds it) instead
 * of adding a brand-new one, restoring the list to its original 9 by the
 * end of the test.
 *
 * [RISK] Removing/re-adding a language package changes which languages
 * are SELECTABLE instance-wide in Localization's Language dropdown, but
 * does NOT change anyone's currently-active language -- an additive/
 * reversible, low-blast-radius change (same risk class as adding a Job
 * Title), unlike Localization itself (which changes the ACTIVE default
 * for everyone).
 */
export class AdminLanguagePackagesPage extends BasePage {
  readonly addButton: Locator;
  readonly nameSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.nameSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Name', { exact: true }) })
      .locator('.oxd-select-text');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span, .oxd-form-row .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/languagePackage');
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  }

  /**
   * [TEMUAN PROSES, PENTING] This dropdown's ~490-option list is NOT
   * actually filtered by typing (confirmed live: option count stays ~490
   * after typing a search string -- it looks like an autocomplete but
   * isn't), so `.filter({hasText})` or keyboard ArrowDown+Enter on the
   * unfiltered list select the WRONG option or nothing at all. The ONLY
   * reliable way confirmed live: scope `getByText(fullExactName, {exact:
   * true})` to `.oxd-select-dropdown` and click that -- a plain substring
   * match risks matching a sibling locale (e.g. "Tamil (Malaysia)" also
   * contains "Tamil"). Because an unreliable Add here could leave the
   * shared demo's language package list permanently short one entry, TCs
   * verify the GROUND TRUTH via the read-only API
   * (`isLanguagePackageActive`) rather than trusting the UI's own
   * post-Save render. Confirmed live: Save fires
   * `PUT /api/v2/admin/i18n/languages/{id}` (toggles that language's
   * active flag), not a POST to a collection.
   */
  async isLanguagePackageActive(name: string): Promise<boolean> {
    const baseURL = new URL(this.page.url()).origin;
    const resp = await this.page.request.get(
      `${baseURL}/web/index.php/api/v2/admin/i18n/languages?activeOnly=true&limit=0`,
    );
    const body = await resp.json();
    return (body.data as { name: string }[]).some((d) => d.name.includes(name));
  }

  /** Looks up the full exact display name (incl. native script) for a locale from the complete (not-filtered) list, by a loose substring. */
  async fullLanguageName(looseMatch: string): Promise<string | null> {
    const baseURL = new URL(this.page.url()).origin;
    const resp = await this.page.request.get(`${baseURL}/web/index.php/api/v2/admin/i18n/languages?activeOnly=false&limit=0`);
    const body = await resp.json();
    const match = (body.data as { name: string }[]).find((d) => d.name.startsWith(looseMatch));
    return match ? match.name : null;
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /** Icons in confirmed DOM order: [0]=upload, [1]=translate, [2]=download, [3]=trash (Delete). */
  async deleteRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').nth(3).click();
    await this.confirmDeleteButton.click();
  }

  /**
   * Opens Add, resolves the locale's full exact display name via the API
   * (`fullLanguageName`), clicks it via an EXACT text match scoped to the
   * dropdown (the only reliable selection method confirmed live -- see
   * class JSDoc), and Saves. Retries up to `attempts` times, re-verifying
   * via the API after each attempt, so a single flaky UI interaction
   * cannot leave the package missing on the shared demo.
   */
  async addLanguagePackageRobust(looseMatch: string, attempts = 3): Promise<boolean> {
    for (let i = 0; i < attempts; i++) {
      if (await this.isLanguagePackageActive(looseMatch)) return true;
      const fullName = await this.fullLanguageName(looseMatch);
      if (!fullName) continue;
      await this.goto();
      await this.addButton.click();
      await this.page.waitForTimeout(800);
      await this.nameSelect.click();
      await this.page.waitForTimeout(500);
      const exactOption = this.page.locator('.oxd-select-dropdown').getByText(fullName, { exact: true });
      await exactOption.first().click({ timeout: 10_000 }).catch(() => {});
      await this.page.waitForTimeout(500);
      await this.save();
      await this.page.waitForTimeout(1500);
      if (await this.isLanguagePackageActive(looseMatch)) return true;
    }
    return false;
  }
}
