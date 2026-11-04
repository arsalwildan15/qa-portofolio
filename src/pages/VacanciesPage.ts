import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class VacanciesPage extends BasePage {
  readonly addButton: Locator;
  /** The list page's "Vacancy" filter is a dropdown of existing vacancy names, not free text. */
  readonly searchSelect: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly tableRows: Locator;
  // Add Vacancy form fields
  readonly vacancyNameInput: Locator;
  readonly jobTitleSelect: Locator;
  readonly descriptionTextarea: Locator;
  readonly hiringManagerInput: Locator;
  readonly numberOfPositionsInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  /**
   * [TEMUAN] Status aktif/inaktif pada form Add/Edit Vacancy adalah TOGGLE
   * SWITCH berlabel teks "Active" di sampingnya (bukan dropdown "Status"
   * seperti filter di halaman list), confirmed via live discovery run:
   * payload PUT/POST vacancy membawa field boolean "status" (true/false).
   */
  readonly activeStatusToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.searchSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Vacancy', { exact: true }) })
      .locator('.oxd-select-text');
    this.tableRows = page.locator('.oxd-table-card');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });

    this.vacancyNameInput = byLabel('Vacancy Name');
    this.jobTitleSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Job Title', { exact: true }) })
      .locator('.oxd-select-text');
    this.descriptionTextarea = page.locator('textarea');
    this.hiringManagerInput = page.getByPlaceholder('Type for hints...');
    this.numberOfPositionsInput = byLabel('Number of Positions');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.activeStatusToggle = page
      .locator('p.oxd-text', { hasText: 'Active' })
      .locator('xpath=following-sibling::div//input[@type="checkbox"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/recruitment/viewJobVacancy');
  }

  async gotoAddForm(): Promise<void> {
    await this.page.goto('/web/index.php/recruitment/addJobVacancy');
  }

  /**
   * [TEMUAN PENTING] Edit Vacancy memakai URL dan FORM yang SAMA dengan
   * Add Vacancy (/web/index.php/recruitment/addJobVacancy/<id>), bukan
   * halaman/URL terpisah. Dikonfirmasi live lewat klik icon pensil di row
   * list: browser diarahkan ke addJobVacancy/<id>, bukan addJobVacancy
   * polos.
   */
  async gotoEditForm(id: number): Promise<void> {
    await this.page.goto(`/web/index.php/recruitment/addJobVacancy/${id}`);
  }

  /**
   * Row actions pada list (dikonfirmasi live lewat innerHTML): index 0 =
   * trash/delete icon, index 1 = pencil/edit icon.
   */
  async openEditFromRow(row: Locator): Promise<void> {
    await row.locator('button').nth(1).click();
  }

  async deleteFromRow(row: Locator): Promise<void> {
    await row.locator('button').nth(0).click();
  }

  /** Toggles the Active/Inactive switch. Confirmed live: unchecked -> payload status:false. */
  async toggleActiveStatus(): Promise<void> {
    await this.activeStatusToggle.click({ force: true });
  }

  async selectDropdownOption(select: Locator, optionText: string): Promise<void> {
    await select.click();
    const option = this.page.getByRole('option').filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Hiring Manager is REQUIRED (confirmed live: an empty Hiring Manager
   * blocks Save client-side with a "Required" error, POST never fires,
   * which looks exactly like a hung/slow server response if you only
   * wait on the network request). Fills it via the async autocomplete and
   * picks the first real suggestion, same pattern as the Interviewer
   * field on Candidates.
   */
  async fillFirstHiringManager(): Promise<void> {
    await this.hiringManagerInput.fill('a');
    await this.page.waitForTimeout(500);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    const options = this.page.locator('.oxd-autocomplete-option');
    if ((await options.count()) > 0) await options.first().click();
  }

  async search(): Promise<void> {
    await this.searchButton.click();
  }

  /** List page's "Vacancy" filter is a dropdown listing existing vacancy names, not a text field. */
  async searchByVacancyName(name: string): Promise<void> {
    await this.selectDropdownOption(this.searchSelect, name);
  }

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }
}
