import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Configuration > Modules. Confirmed live: /admin/viewModules.
 *
 * 11 modules, each rendered as `.orangehrm-module-field-row` containing a
 * `<p class="orangehrm-module-field-label">` (label text) and an
 * `.oxd-switch-wrapper` toggle switch: Admin Module, Pim Module, Leave
 * Module, Time Module, Recruitment Module, Performance Module, Directory
 * Module, Maintenance Module, Mobile, Claim Module, Buzz (confirmed live
 * -- note "Mobile" and "Buzz" do NOT have the "Module" suffix the others
 * have). [TEMUAN PENTING] "Admin Module"'s switch input has the `disabled`
 * HTML attribute -- confirmed live the app itself locks this one so it
 * can never be turned off (self-protection against locking yourself out
 * of Admin). Only button: Save (no Reset, no Cancel).
 *
 * [SAFETY CONSTRAINT -- PENTING] Disabling ANY module here (other than
 * the already-locked Admin) would remove that module from the sidebar
 * for EVERY concurrent user of this shared public demo -- including
 * possibly breaking other concurrently-running test suites against this
 * same instance. This suite's TCs therefore NEVER click Save on this
 * screen under any circumstance -- not even to toggle-then-immediately-
 * revert, since the brief's own guidance is that a thinner, zero-Save TC
 * is strictly safer than one that risks it. Every check here is either
 * purely observational (reading current state) or proves that toggling a
 * switch client-side without Save does not persist.
 */
export class AdminModulesPage extends BasePage {
  readonly saveButton: Locator;
  readonly moduleRows: Locator;

  constructor(page: Page) {
    super(page);
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.moduleRows = page.locator('.orangehrm-module-field-row');
  }

  /**
   * Waits for GET /api/v2/admin/modules to resolve before returning --
   * same hydration-race guard as AdminGeneralInformationPage.goto() /
   * AdminEmailConfigurationPage.goto(): the row skeletons render and
   * become "visible" before the switches' checked state reflects the
   * server's real data, so reading `isChecked()` right after a blind
   * goto() can misread a module as off when it is actually on.
   */
  async goto(): Promise<void> {
    const getPromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/admin/modules') && r.request().method() === 'GET', {
        timeout: 10_000,
      })
      .catch(() => null);
    await this.page.goto('/web/index.php/admin/viewModules');
    await getPromise;
    await this.moduleRows.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  /** Exact label text match, e.g. "Admin Module", "Mobile", "Buzz". */
  rowByLabel(label: string): Locator {
    return this.moduleRows.filter({ has: this.page.getByText(label, { exact: true }) });
  }

  switchInput(row: Locator): Locator {
    return row.locator('input[type="checkbox"]');
  }
}
