import { type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { type ReportToPage } from '../pages/ReportToPage';
import { type PerformanceManageReviewsPage } from '../pages/PerformanceManageReviewsPage';
import { setupReviewableEmployee } from './setupReviewableEmployee';

/**
 * Creates a review for a fresh employee whose Job Title ("QA Engineer") has KPIs, optionally
 * activating it. Throws if the review id can't be obtained, so callers never evaluate a
 * phantom review.
 */
export async function createReview(
  page: Page,
  pages: {
    addEmployeePage: AddEmployeePage;
    reportToPage: ReportToPage;
    performanceManageReviewsPage: PerformanceManageReviewsPage;
  },
  namePrefix: string,
  options: { activate: boolean } = { activate: true },
): Promise<{ reviewId: number; emp: { empNumber: number; employeeId: string; firstName: string; lastName: string } }> {
  const { emp, supervisorSearchTerm } = await setupReviewableEmployee(
    page, pages.addEmployeePage, pages.reportToPage, namePrefix, 'QA Engineer',
  );
  const reviews = pages.performanceManageReviewsPage;
  await reviews.gotoAdd();
  await reviews.selectEmployee(emp.employeeId, emp.lastName);
  await reviews.selectSupervisorReviewer(supervisorSearchTerm);
  await reviews.fillReviewPeriod('2026-01-01', '2026-06-30', '2026-07-15');
  const saveResp = await reviews.save();
  const reviewId = (await saveResp?.json().catch(() => null))?.data?.id as number | undefined;
  if (!reviewId) throw new Error(`createReview: no review id (save status=${saveResp?.status()})`);

  if (options.activate) {
    await reviews.gotoEdit(reviewId);
    const actResp = await reviews.activate(reviewId);
    if (actResp?.status() !== 200) throw new Error(`createReview: activate status=${actResp?.status()}`);
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  return { reviewId, emp };
}
