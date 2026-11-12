import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CandidatesPage extends BasePage {
  readonly addButton: Locator;
  readonly tableRows: Locator;
  // Add/Edit Candidate form fields
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly vacancySelect: Locator;
  readonly emailInput: Locator;
  readonly contactNumberInput: Locator;
  readonly fileInput: Locator;
  readonly keywordsInput: Locator;
  readonly notesTextarea: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  // Application Stage / status workflow
  readonly statusText: Locator;
  // Interview form fields (Schedule Interview)
  readonly interviewTitleInput: Locator;
  readonly interviewerInput: Locator;
  readonly interviewDateInput: Locator;
  // Candidate History
  readonly historyRows: Locator;
  // List page filters
  readonly candidateNameFilterInput: Locator;
  readonly searchButton: Locator;
  /**
   * [TEMUAN] Candidates list filter form, confirmed live via innerHTML,
   * punya 7 field total: Job Title (dropdown), Vacancy (dropdown),
   * Hiring Manager (dropdown), Status (dropdown), Candidate Name
   * (autocomplete, sudah ada method filterByCandidateName()), Keywords
   * (free text), Date of Application (range: From/To date pickers).
   */
  readonly jobTitleFilterSelect: Locator;
  readonly vacancyFilterSelect: Locator;
  readonly hiringManagerFilterSelect: Locator;
  readonly statusFilterSelect: Locator;
  readonly keywordsFilterInput: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly resetButton: Locator;
  // "+ Add Another" interviewer row (Schedule Interview form)
  readonly addAnotherInterviewerButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.tableRows = page.locator('.oxd-table-card');

    this.firstNameInput = page.getByPlaceholder('First Name');
    this.middleNameInput = page.getByPlaceholder('Middle Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.vacancySelect = page
      .locator('.oxd-input-group', { has: page.getByText('Vacancy', { exact: true }) })
      .locator('.oxd-select-text');
    this.emailInput = byLabel('Email');
    this.contactNumberInput = byLabel('Contact Number');
    this.fileInput = page.locator('input[type="file"]');
    this.keywordsInput = byLabel('Keywords');
    // Shared by the main Add/Edit form's Notes field AND every status-change
    // confirmation form (Shortlist, Schedule Interview, Mark Interview
    // Passed/Failed): only one textarea is ever visible/active at a time.
    this.notesTextarea = page.locator('textarea');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');

    // "Status: <X>" is rendered as plain text, not a labeled input group.
    this.statusText = page.locator('text=/^Status:/').first();

    this.interviewTitleInput = page
      .locator('.oxd-input-group', { has: page.getByText('Interview Title', { exact: true }) })
      .locator('input');
    // Async autocomplete, same pattern as PIM's Report-to field: typing
    // triggers a "Searching...." placeholder option before real results
    // appear (see selectFirstInterviewer()).
    this.interviewerInput = page.getByPlaceholder('Type for hints...');
    this.interviewDateInput = page.locator('input[placeholder="yyyy-dd-mm"]').first();

    this.historyRows = page.locator('.oxd-table-card');

    // List page's "Candidate Name" filter. Shares the same "Type for
    // hints..." placeholder as the Interviewer field, but only the list
    // page context matters when this locator is used (goto() called first).
    this.candidateNameFilterInput = page.getByPlaceholder('Type for hints...');
    this.searchButton = page.getByRole('button', { name: 'Search' });

    const byFilterLabel = (label: string) =>
      page
        .locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) })
        .locator('.oxd-select-text');
    this.jobTitleFilterSelect = byFilterLabel('Job Title');
    this.vacancyFilterSelect = byFilterLabel('Vacancy');
    this.hiringManagerFilterSelect = byFilterLabel('Hiring Manager');
    this.statusFilterSelect = byFilterLabel('Status');
    this.keywordsFilterInput = page
      .locator('.oxd-input-group', { has: page.getByText('Keywords', { exact: true }) })
      .locator('input');
    this.dateFromInput = page.getByPlaceholder('From');
    this.dateToInput = page.getByPlaceholder('To');
    this.resetButton = page.getByRole('button', { name: 'Reset' });

    this.addAnotherInterviewerButton = page.getByRole('button', { name: 'Add Another' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/recruitment/viewCandidates');
  }

  async gotoAddForm(): Promise<void> {
    await this.page.goto('/web/index.php/recruitment/addCandidate');
  }

  async gotoDetail(candidateId: number): Promise<void> {
    await this.page.goto(`/web/index.php/recruitment/addCandidate/${candidateId}`);
  }

  async fillName(firstName: string, lastName: string, middleName = ''): Promise<void> {
    await this.firstNameInput.fill(firstName);
    if (middleName) await this.middleNameInput.fill(middleName);
    await this.lastNameInput.fill(lastName);
  }

  async selectDropdownOption(select: Locator, optionText: string): Promise<void> {
    await select.click();
    const option = this.page.getByRole('option').filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  /** Picks the first real vacancy option (position 1; position 0 is the placeholder). */
  async selectFirstVacancy(): Promise<string> {
    await this.vacancySelect.click();
    const option = this.page.getByRole('option').nth(1);
    const name = (await option.textContent())?.trim() ?? '';
    await option.click();
    return name;
  }

  /**
   * Picks a vacancy that has a hiring manager assigned, instead of blindly picking the first
   * dropdown option like selectFirstVacancy(). Root-caused 2026-11-12 (BG-007): the Shortlist
   * endpoint (PUT .../candidates/<id>/shortlist) returns 500 specifically when the candidate's
   * vacancy has hiringManager === null -- confirmed via an 8/8 correlation across independent
   * trials -- and the dropdown's first option ("Junior Account Assistant") happens to be exactly
   * such a vacancy, which is why every status-workflow TC using selectFirstVacancy() hit this
   * bug. Queries the vacancies API directly (dynamic, not a hardcoded vacancy name) to find one
   * with a hiring manager, then selects it by name in the UI dropdown. Falls back to
   * selectFirstVacancy() if no such vacancy is found (keeps tests runnable, though they'll still
   * hit BG-007 in that case).
   */
  async selectVacancyWithHiringManager(): Promise<string> {
    const listResp = await this.page.request.get('/web/index.php/api/v2/recruitment/vacancies?limit=50&offset=0&status=true');
    const list = await listResp.json().catch(() => null);
    for (const v of list?.data ?? []) {
      const detailResp = await this.page.request.get(`/web/index.php/api/v2/recruitment/vacancies/${v.id}`);
      const detail = await detailResp.json().catch(() => null);
      // NOTE 2026-11-12: GET /api/v2/recruitment/vacancies/:id serializes "no hiring manager" as
      // an OBJECT with every field null ({id:null,firstName:null,...}), NOT a literal `null` --
      // different from how GET /api/v2/recruitment/candidates/:id nests the same relationship
      // (literal `null`). A plain truthy check on the object itself is always true and silently
      // picks a no-hiring-manager vacancy every time. Must check the `id` field specifically
      // (!= null, not truthy, in case an id of 0 is ever valid).
      if (detail?.data?.hiringManager?.id != null) {
        await this.vacancySelect.click();
        const option = this.page.getByRole('option').filter({ hasText: v.name }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();
        return v.name;
      }
    }
    return this.selectFirstVacancy();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  rowByText(text: string): Locator {
    return this.tableRows.filter({ hasText: text });
  }

  /** The row's first Actions icon button opens candidate detail (view); the second deletes it. */
  async openDetailFromRow(row: Locator): Promise<void> {
    await row.locator('button').first().click();
  }

  async deleteFromRow(row: Locator): Promise<void> {
    await row.locator('button').nth(1).click();
  }

  /**
   * The list's "Candidate Name" filter is an autocomplete that only accepts
   * a value picked from its own suggestion list; typing a freshly created
   * candidate's full name usually has no suggestion yet and the field shows
   * "Invalid" (confirmed live), so it cannot reliably filter a just-created
   * record. Use gotoLastPage() instead when hunting for a brand-new row.
   */
  async filterByCandidateName(name: string): Promise<void> {
    await this.candidateNameFilterInput.fill(name);
    await this.page.waitForTimeout(500);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    const options = this.page.locator('.oxd-autocomplete-option');
    if ((await options.count()) > 0) await options.first().click();
    await this.searchButton.click();
  }

  /**
   * The demo has 75+ seeded candidate records across multiple pages, and
   * newly created candidates are appended at the end, not page 1. Jumps to
   * the highest-numbered pagination button so a just-created row is visible.
   */
  async gotoLastPage(): Promise<void> {
    const pagination = this.page.getByRole('navigation', { name: 'Pagination Navigation' });
    const numberedButtons = pagination.getByRole('button').filter({ hasText: /^\d+$/ });
    const count = await numberedButtons.count();
    if (count > 0) await numberedButtons.nth(count - 1).click();
    await this.page.waitForTimeout(1500);
  }

  statusActionButton(label: string): Locator {
    return this.page.getByRole('button', { name: label, exact: true });
  }

  /**
   * Types into the Interviewer autocomplete and waits out the transient
   * "Searching...." placeholder option before clicking the first real
   * result, confirmed live: clicking too early selects "Searching...." as
   * a literal value instead of a real interviewer.
   */
  async selectFirstInterviewer(): Promise<void> {
    await this.interviewerInput.fill('a');
    await this.page.waitForTimeout(500);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    const options = this.page.locator('.oxd-autocomplete-option');
    if ((await options.count()) > 0) await options.first().click();
  }

  /**
   * Clicks "+ Add Another" to reveal a second Interviewer autocomplete row,
   * then fills it picking a DIFFERENT suggestion than index 0 (used for the
   * first interviewer) so the two interviewers are distinct.
   */
  async addAnotherInterviewer(): Promise<void> {
    await this.addAnotherInterviewerButton.click();
    await this.page.waitForTimeout(500);
    const inputs = this.page.getByPlaceholder('Type for hints...');
    const secondInput = inputs.nth(1);
    await secondInput.fill('a');
    await this.page.waitForTimeout(500);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    const options = this.page.locator('.oxd-autocomplete-option');
    const count = await options.count();
    if (count > 1) await options.nth(1).click();
    else if (count > 0) await options.first().click();
  }

  /** Selects a dropdown option in one of the list filter fields by text. */
  async selectFilterOption(select: Locator, optionText: string): Promise<void> {
    await select.click();
    const option = this.page.getByRole('option').filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  /** Reads the first real (non-placeholder) option's text for a filter dropdown, without selecting it. */
  async firstFilterOptionText(select: Locator): Promise<string> {
    await select.click();
    const option = this.page.getByRole('option').nth(1);
    const text = (await option.textContent())?.trim() ?? '';
    await this.page.keyboard.press('Escape');
    return text;
  }
}
