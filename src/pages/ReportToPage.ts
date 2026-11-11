import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReportToPage extends BasePage {
  /** 3 "+ Add" buttons on this page: Supervisors (0), Subordinates (1), Attachments (2). */
  readonly addButtons: Locator;
  readonly nameAutocomplete: Locator;
  readonly reportingMethodSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly supervisorRows: Locator;
  readonly subordinateRows: Locator;

  constructor(page: Page) {
    super(page);
    this.addButtons = page.getByRole('button', { name: /Add/i });
    this.nameAutocomplete = page
      .locator('.oxd-input-group', { has: page.getByText('Name', { exact: true }) })
      .getByPlaceholder('Type for hints...');
    this.reportingMethodSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Reporting Method', { exact: true }) })
      .locator('.oxd-select-text');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    // [DIKEMBALIKAN 2026-11-11 setelah 4 percobaan fix gagal -- lihat
    // docs/QA-Review-Progress.md untuk riwayat lengkap investigasi. Fitur Report-to SENDIRI
    // sudah dikonfirmasi berfungsi benar (TC-PIM-REPORTTO-07: POST .../supervisors -> 200
    // nyata), ini murni locator UI yang belum ketemu bentuk tepatnya. Dikembalikan ke versi
    // original ini sebagai known-issue, bukan dibiarkan versi hasil tebakan yang malah
    // meregresi TC lain yang sebelumnya PASS.]
    this.supervisorRows = page
      .locator('div', { has: page.getByText('Assigned Supervisors', { exact: true }) })
      .locator('.oxd-table-card');
    this.subordinateRows = page
      .locator('div', { has: page.getByText('Assigned Subordinates', { exact: true }) })
      .locator('.oxd-table-card');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewReportToDetails/empNumber/${empNumber}`);
  }

  async openAddSupervisor(): Promise<void> {
    await this.addButtons.nth(0).click();
  }

  async openAddSubordinate(): Promise<void> {
    await this.addButtons.nth(1).click();
  }

  async selectDropdownOption(select: Locator, optionText: string): Promise<void> {
    await select.click();
    const option = this.page.getByRole('option').filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  /**
   * Types into the Name autocomplete and waits out the transient
   * "Searching...." placeholder option before clicking the first real
   * result, same pattern as CandidatesPage.selectFirstInterviewer() --
   * clicking too early selects "Searching...." as a literal value
   * instead of a real employee. Returns the selected option's text.
   */
  async selectFirstNameOption(searchTerm: string): Promise<string> {
    await this.nameAutocomplete.waitFor({ state: 'visible' });
    await this.nameAutocomplete.fill(searchTerm);
    await this.page.waitForTimeout(500);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    const firstOption = this.page.getByRole('option').first();
    await firstOption.waitFor({ state: 'visible', timeout: 25_000 });
    const selectedName = (await firstOption.textContent())?.trim() ?? '';
    await firstOption.click();
    return selectedName;
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
