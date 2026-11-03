import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';
import { uniqueEmployeeName } from '../../src/data/testData';

test.describe('PIM - Employee management', () => {
  test('add a new employee', async ({ page, pimPage }) => {
    const employee = uniqueEmployeeName('Playwright');

    await pimPage.goto();
    await pimPage.addEmployee(employee);

    await expect(page).toHaveURL(/pim\/viewPersonalDetails/);
    await expect(pimPage.employeeFullName).toContainText(employee.firstName);
    await expect(pimPage.employeeFullName).toContainText(employee.lastName);
  });

  test('search for a non-existent employee returns no records', async ({ pimPage }) => {
    await pimPage.goto();
    await pimPage.employeeNameFilter.fill('NonExistentEmployeeXYZ');
    await pimPage.searchButton.click();

    await expect(pimPage.noRecordsFound).toBeVisible();
  });
});
