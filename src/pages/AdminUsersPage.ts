import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > User Management > Users. Confirmed live: list at
 * /admin/viewSystemUsers, Add form at /admin/saveSystemUser.
 * Add form fields: Username, User Role (dropdown), Employee Name
 * (autocomplete), Status ([TEMUAN] DROPDOWN "-- Select --" dengan opsi
 * Enabled/Disabled -- BUKAN toggle checkbox seperti dugaan awal,
 * dikonfirmasi live lewat pesan "Required" yang tersisa setelah semua
 * field lain diisi), Password, Confirm Password.
 */
export class AdminUsersPage extends BasePage {
  readonly addButton: Locator;
  readonly usernameInput: Locator;
  readonly userRoleSelect: Locator;
  readonly employeeNameInput: Locator;
  readonly statusSelect: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  readonly confirmDeleteButton: Locator;
  readonly searchUsernameInput: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.usernameInput = page
      .locator('.oxd-input-group', { has: page.getByText('Username', { exact: true }) })
      .locator('input');
    this.userRoleSelect = page
      .locator('.oxd-input-group', { has: page.getByText('User Role', { exact: true }) })
      .locator('.oxd-select-text');
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.statusSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Status', { exact: true }) })
      .locator('.oxd-select-text');
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').last();
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
    this.searchUsernameInput = this.usernameInput;
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/viewSystemUsers');
  }

  async gotoAdd(): Promise<void> {
    await this.goto();
    await this.addButton.click();
  }

  async selectUserRole(role: string): Promise<void> {
    await this.userRoleSelect.click();
    await this.page.getByRole('option', { name: role, exact: true }).click();
  }

  async selectStatus(status: 'Enabled' | 'Disabled'): Promise<void> {
    await this.statusSelect.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
  }

  /** Same async-autocomplete pattern as Hiring Manager in Recruitment (VacanciesPage.fillFirstHiringManager). */
  async fillFirstEmployeeName(): Promise<void> {
    await this.employeeNameInput.fill('a');
    await this.page.waitForTimeout(500);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    const options = this.page.locator('.oxd-autocomplete-option');
    if ((await options.count()) > 0) await options.first().click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  rowByUsername(username: string): Locator {
    return this.tableRows.filter({ hasText: username });
  }

  async deleteRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').first().click();
    await this.confirmDeleteButton.click();
  }

  /**
   * [TEMUAN] Field "Username" di form filter TERLIHAT seperti search box bebas (contoh:
   * ketik substring untuk narrow-down), tapi API-nya EXACT MATCH case-insensitive --
   * dikonfirmasi live 2026-11-12: username="ess_han" (lengkap) -> 1 hasil, "ess_ha" (substring)
   * -> 0 hasil, "Ess_han" (beda kapital, lengkap) -> tetap 1 hasil. Sama kelasnya dgn temuan
   * lama soal jangan asumsikan perilaku field dari label UI-nya saja (lihat TC-PIM.txt poin 11).
   */
  async checkRow(username: string): Promise<void> {
    await this.rowByUsername(username).locator('input[type="checkbox"]').check({ force: true });
  }

  /** "Delete Selected" bulk-action button, appears only once >=1 row checkbox is checked. */
  get deleteSelectedButton(): Locator {
    return this.page.getByRole('button', { name: /Delete Selected/i });
  }

  /**
   * Clicks "Delete Selected" then confirms the "Yes, Delete" dialog, returning the single
   * bulk DELETE /api/v2/admin/users response. Confirmed live: 1 DELETE request handles every
   * checked row at once, body shaped {"ids":[<id1>,<id2>,...]} -- NOT one DELETE per row.
   */
  async bulkDeleteSelected() {
    await this.deleteSelectedButton.click();
    const [resp] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().endsWith('/api/v2/admin/users') && r.request().method() === 'DELETE',
        { timeout: 10_000 },
      ),
      this.confirmDeleteButton.click(),
    ]);
    return resp;
  }
}
