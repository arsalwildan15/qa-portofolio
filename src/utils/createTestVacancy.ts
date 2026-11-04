import { type Page } from '@playwright/test';
import { type VacanciesPage } from '../pages/VacanciesPage';
import { uniqueName } from '../data/testData';

/**
 * Creates a vacancy (Job Title, Hiring Manager via async autocomplete,
 * Number of Positions) via Add Vacancy. Unlike Add Candidate, the SPA DOES
 * update the URL bar after Save to /addJobVacancy/<id> (confirmed live via
 * discovery run), so the id is read from page.url() rather than the POST
 * response body.
 */
export async function createTestVacancy(
  page: Page,
  vacanciesPage: VacanciesPage,
  namePrefix: string,
  numberOfPositions = '2',
): Promise<{ vacancyId: number; vacancyName: string }> {
  const vacancyName = uniqueName(namePrefix);
  await vacanciesPage.gotoAddForm();
  await vacanciesPage.vacancyNameInput.fill(vacancyName);
  await vacanciesPage.jobTitleSelect.click();
  await page.getByRole('option').nth(1).click();
  await vacanciesPage.fillFirstHiringManager();
  await vacanciesPage.numberOfPositionsInput.fill(numberOfPositions);

  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/vacancies') && r.request().method() === 'POST'),
    vacanciesPage.save(),
  ]);
  await page.waitForTimeout(1200);

  const match = page.url().match(/addJobVacancy\/(\d+)/);
  const vacancyId = match ? Number(match[1]) : NaN;
  if (!vacancyId) throw new Error('createTestVacancy: could not read vacancy id from URL after save');

  return { vacancyId, vacancyName };
}
