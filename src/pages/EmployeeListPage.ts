import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class EmployeeListPage extends BasePage {
  readonly employeeNameFilter: Locator;
  readonly employeeIdFilter: Locator;
  readonly supervisorNameFilter: Locator;
  readonly employmentStatusSelect: Locator;
  readonly includeSelect: Locator;
  readonly jobTitleSelect: Locator;
  readonly subUnitSelect: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly addButton: Locator;
  readonly recordsFoundText: Locator;
  readonly noRecordsFound: Locator;
  readonly tableRows: Locator;
  readonly selectAllCheckbox: Locator;
  readonly deleteSelectedButton: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    // Employee List has two "Type for hints..." autocomplete inputs (Employee Name,
    // Supervisor Name); scope each to its label's surrounding field group.
    this.employeeNameFilter = page
      .locator('.oxd-input-group', { has: page.getByText('Employee Name', { exact: true }) })
      .getByPlaceholder('Type for hints...');
    this.supervisorNameFilter = page
      .locator('.oxd-input-group', { has: page.getByText('Supervisor Name', { exact: true }) })
      .getByPlaceholder('Type for hints...');
    this.employeeIdFilter = page
      .locator('.oxd-input-group', { has: page.getByText('Employee Id', { exact: true }) })
      .locator('input');
    // Employment Status, Include, Job Title, Sub Unit each render as a
    // `.oxd-select-text` dropdown trigger. Scoped by each field's label text
    // (confirmed live) rather than positional `.nth()`, which proved unreliable —
    // DOM order didn't consistently match UI order across runs.
    this.employmentStatusSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Employment Status', { exact: true }) })
      .locator('.oxd-select-text');
    this.includeSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Include', { exact: true }) })
      .locator('.oxd-select-text');
    this.jobTitleSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Job Title', { exact: true }) })
      .locator('.oxd-select-text');
    this.subUnitSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Sub Unit', { exact: true }) })
      .locator('.oxd-select-text');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.addButton = page.getByRole('button', { name: '+ Add' });
    this.recordsFoundText = page.getByText(/Records Found/);
    this.noRecordsFound = page.getByText('No Records Found').first();
    this.tableRows = page.locator('.oxd-table-card');
    this.selectAllCheckbox = page.locator('.oxd-table-header .oxd-checkbox-input').first();
    this.deleteSelectedButton = page.getByRole('button', { name: /Delete Selected/i });
    // Confirmation modal wording confirmed live: "Yes, Delete" / "No, Cancel".
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
    this.cancelDeleteButton = page.getByRole('button', { name: /No, Cancel/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/viewEmployeeList');
  }

  async search(): Promise<void> {
    await this.searchButton.click();
  }

  /**
   * Clicks a dropdown option by visible text after opening the given select
   * trigger. Uses a `hasText` filter rather than an exact accessible-name
   * match — the latter proved unreliable (intermittently failed to match
   * even though the option was visibly present), while filtering the
   * rendered option list by substring consistently worked in live testing.
   */
  async selectDropdownOption(select: Locator, optionText: string): Promise<void> {
    await select.click();
    const option = this.page.getByRole('option').filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  /**
   * Every text/role-based attempt to isolate a single header cell by name
   * proved unreliable live — `hasText` substring-matches "Id" inside
   * "Middle", the accessible name carries a trailing space that breaks
   * `exact: true`, and `getByText(..., { exact: true })` still didn't match
   * (likely a non-plain-text node in the cell). Column order is stable and
   * confirmed live instead: index 0 is the select-all checkbox header,
   * index 1 is "Id", 2 is "First (& Middle) Name", 3 "Last Name", etc. —
   * `columnIndex` is 0-based counting the checkbox column.
   */
  headerCellByIndex(columnIndex: number): Locator {
    return this.page.locator('.oxd-table-header-cell').nth(columnIndex);
  }

  pageButton(pageNumber: number): Locator {
    return this.page.getByRole('button', { name: String(pageNumber), exact: true });
  }

  rowCheckbox(index: number): Locator {
    return this.page.locator('.oxd-table-row .oxd-checkbox-input').nth(index);
  }
}
