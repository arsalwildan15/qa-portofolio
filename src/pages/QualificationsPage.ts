import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class QualificationsPage extends BasePage {
  /** 6 "+ Add" buttons: Work Experience(0), Education(1), Skills(2), Languages(3), License(4), Attachments(5). */
  readonly addButtons: Locator;
  // Work Experience modal fields
  readonly companyInput: Locator;
  readonly jobTitleInput: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly commentInput: Locator;
  // Education modal fields
  readonly educationLevelSelect: Locator;
  readonly educationYearInput: Locator;
  readonly educationGpaInput: Locator;
  // Skills form fields (rendered inline below the section, not a modal)
  readonly skillSelect: Locator;
  readonly yearsOfExperienceInput: Locator;
  // Languages form fields (also inline, not a modal)
  readonly languageSelect: Locator;
  readonly fluencySelect: Locator;
  readonly competencySelect: Locator;
  // License form fields (also inline, not a modal)
  readonly licenseTypeSelect: Locator;
  readonly licenseNumberInput: Locator;
  readonly issuedDateInput: Locator;
  readonly expiryDateInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.addButtons = page.getByRole('button', { name: /Add/i });
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.companyInput = byLabel('Company');
    this.jobTitleInput = byLabel('Job Title');
    const dateInputs = page.locator('input[placeholder="yyyy-dd-mm"]');
    this.fromDateInput = dateInputs.nth(0);
    this.toDateInput = dateInputs.nth(1);
    this.commentInput = page.locator('textarea');
    this.educationLevelSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Level', { exact: true }) })
      .locator('.oxd-select-text');
    this.educationYearInput = page
      .locator('.oxd-input-group', { has: page.getByText('Year', { exact: true }) })
      .locator('input');
    this.educationGpaInput = page
      .locator('.oxd-input-group', { has: page.getByText('GPA/Score', { exact: true }) })
      .locator('input');
    const byLabelSelect = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('.oxd-select-text');
    this.skillSelect = byLabelSelect('Skill');
    this.yearsOfExperienceInput = byLabel('Years of Experience');
    this.languageSelect = byLabelSelect('Language');
    this.fluencySelect = byLabelSelect('Fluency');
    this.competencySelect = byLabelSelect('Competency');
    this.licenseTypeSelect = byLabelSelect('License Type');
    this.licenseNumberInput = byLabel('License Number');
    // Same date-input selector as Work Experience's From/To Date, but these
    // are never both on screen at once (only one "+ Add" form is open at a
    // time), so reusing index 0/1 here is unambiguous.
    this.issuedDateInput = dateInputs.nth(0);
    this.expiryDateInput = dateInputs.nth(1);
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewQualifications/empNumber/${empNumber}`);
  }

  async openAddWorkExperience(): Promise<void> {
    await this.addButtons.nth(0).click();
  }

  async openAddEducation(): Promise<void> {
    await this.addButtons.nth(1).click();
  }

  async openAddSkill(): Promise<void> {
    await this.addButtons.nth(2).click();
  }

  async openAddLanguage(): Promise<void> {
    await this.addButtons.nth(3).click();
  }

  async openAddLicense(): Promise<void> {
    await this.addButtons.nth(4).click();
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
}
