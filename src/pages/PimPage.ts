import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface NewEmployee {
  firstName: string;
  lastName: string;
}

export class PimPage extends BasePage {
  readonly addEmployeeLink: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly saveButton: Locator;
  readonly employeeFullName: Locator;
  readonly employeeNameFilter: Locator;
  readonly searchButton: Locator;
  readonly employeeTableRows: Locator;
  readonly noRecordsFound: Locator;

  constructor(page: Page) {
    super(page);
    this.addEmployeeLink = page.getByRole('link', { name: 'Add Employee' });
    this.firstNameInput = page.getByPlaceholder('First Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.employeeFullName = page.locator('h6.--strong');
    // The Employee List search form has two "Type for hints..." autocomplete fields
    // (Employee Name, Supervisor Name); scope to the one inside the Employee Name group.
    this.employeeNameFilter = page
      .locator('.oxd-input-group', { has: page.getByText('Employee Name', { exact: true }) })
      .getByPlaceholder('Type for hints...');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.employeeTableRows = page.locator('.oxd-table-card');
    // "No Records Found" also briefly appears in a toast; take the persistent grid message.
    this.noRecordsFound = page.getByText('No Records Found').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/viewPimModule');
  }

  async addEmployee(employee: NewEmployee): Promise<void> {
    await this.addEmployeeLink.click();
    await this.firstNameInput.fill(employee.firstName);
    await this.lastNameInput.fill(employee.lastName);
    await this.saveButton.click();
  }

  async searchByName(name: string): Promise<void> {
    await this.employeeNameFilter.fill(name);
    await this.page.getByRole('option', { name }).first().click();
    await this.searchButton.click();
  }
}
