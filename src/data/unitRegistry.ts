import { type Page } from '@playwright/test';

/**
 * Registry of every navigable OrangeHRM menu unit, built from the LIVE menu inventory
 * (sidebar + top-nav clicked one by one, 2026-11-15) and used by the data-driven sweep TCs in
 * tests/sweep/. Unit ids match docs/Taxonomy-Coverage-Matrix.xlsx so every sweep check can be
 * traced back to a matrix cell.
 *
 * access:
 *   'admin' -- Admin-only menu (an ESS user must NOT reach it)
 *   'all'   -- available to every logged-in user (ESS included)
 * Detail pages whose URL needs a record id resolve it at run time from the API (read-only),
 * so the sweep never depends on a hard-coded id that the shared demo may have reset.
 */
export type UnitAccess = 'admin' | 'all';
export interface PageUnit {
  id: string;
  path: string;
  access: UnitAccess;
  /** Path after /web/index.php/, or a resolver that builds it from live data. */
  url: string | ((page: Page) => Promise<string | null>);
}

const api = async (page: Page, path: string): Promise<any> =>
  (await page.request.get(`/web/index.php/api/v2/${path}`)).json().catch(() => null);

/** empNumber of the logged-in user: pim/viewMyDetails redirects to .../empNumber/<n> (read-only). */
const me = async (page: Page): Promise<number | null> => {
  await page.goto('/web/index.php/pim/viewMyDetails');
  await page.waitForURL(/empNumber\/\d+/, { timeout: 15_000 }).catch(() => {});
  const m = /empNumber\/(\d+)/.exec(page.url());
  return m ? Number(m[1]) : null;
};

export const PAGE_UNITS: PageUnit[] = [
  { id: 'U001', path: 'Admin > User Management > Users', access: 'admin', url: 'admin/viewSystemUsers' },
  { id: 'U002', path: 'PIM > Employee List', access: 'admin', url: 'pim/viewEmployeeList' },
  { id: 'U003', path: 'Leave > Leave List', access: 'admin', url: 'leave/viewLeaveList' },
  { id: 'U004', path: 'Time > Timesheets > Employee Timesheets', access: 'admin', url: 'time/viewEmployeeTimesheet' },
  { id: 'U005', path: 'Recruitment > Candidates', access: 'admin', url: 'recruitment/viewCandidates' },
  { id: 'U006', path: 'My Info > Personal Details', access: 'all', url: 'pim/viewMyDetails' },
  { id: 'U007', path: 'Performance > Manage Reviews > Employee Reviews', access: 'admin', url: 'performance/searchEvaluatePerformanceReview' },
  { id: 'U008', path: 'Dashboard', access: 'all', url: 'dashboard/index' },
  { id: 'U009', path: 'Directory', access: 'all', url: 'directory/viewDirectory' },
  { id: 'U010', path: 'Maintenance > Purge Records > Employee Records', access: 'admin', url: 'maintenance/purgeEmployee' },
  { id: 'U011', path: 'Claim > Employee Claims', access: 'admin', url: 'claim/viewAssignClaim' },
  { id: 'U012', path: 'Buzz', access: 'all', url: 'buzz/viewBuzz' },
  { id: 'U013', path: 'Admin > Job > Job Titles', access: 'admin', url: 'admin/viewJobTitleList' },
  { id: 'U014', path: 'Admin > Job > Pay Grades', access: 'admin', url: 'admin/viewPayGrades' },
  { id: 'U015', path: 'Admin > Job > Employment Status', access: 'admin', url: 'admin/employmentStatus' },
  { id: 'U016', path: 'Admin > Job > Job Categories', access: 'admin', url: 'admin/jobCategory' },
  { id: 'U017', path: 'Admin > Job > Work Shifts', access: 'admin', url: 'admin/workShift' },
  { id: 'U018', path: 'Admin > Organization > General Information', access: 'admin', url: 'admin/viewOrganizationGeneralInformation' },
  { id: 'U019', path: 'Admin > Organization > Locations', access: 'admin', url: 'admin/viewLocations' },
  { id: 'U020', path: 'Admin > Organization > Structure', access: 'admin', url: 'admin/viewCompanyStructure' },
  { id: 'U021', path: 'Admin > Qualifications > Skills', access: 'admin', url: 'admin/viewSkills' },
  { id: 'U022', path: 'Admin > Qualifications > Education', access: 'admin', url: 'admin/viewEducation' },
  { id: 'U023', path: 'Admin > Qualifications > Licenses', access: 'admin', url: 'admin/viewLicenses' },
  { id: 'U024', path: 'Admin > Qualifications > Languages', access: 'admin', url: 'admin/viewLanguages' },
  { id: 'U025', path: 'Admin > Qualifications > Memberships', access: 'admin', url: 'admin/membership' },
  { id: 'U026', path: 'Admin > Nationalities', access: 'admin', url: 'admin/nationality' },
  { id: 'U027', path: 'Admin > Corporate Branding', access: 'admin', url: 'admin/addTheme' },
  { id: 'U028', path: 'Admin > Configuration > Email Configuration', access: 'admin', url: 'admin/listMailConfiguration' },
  { id: 'U029', path: 'Admin > Configuration > Email Subscriptions', access: 'admin', url: 'admin/viewEmailNotification' },
  { id: 'U030', path: 'Admin > Configuration > Localization', access: 'admin', url: 'admin/localization' },
  { id: 'U031', path: 'Admin > Configuration > Language Packages', access: 'admin', url: 'admin/languagePackage' },
  { id: 'U032', path: 'Admin > Configuration > Modules', access: 'admin', url: 'admin/viewModules' },
  { id: 'U033', path: 'Admin > Configuration > Social Media Authentication', access: 'admin', url: 'admin/openIdProvider' },
  { id: 'U034', path: 'Admin > Configuration > Register OAuth Client', access: 'admin', url: 'admin/registerOAuthClient' },
  { id: 'U035', path: 'Admin > Configuration > LDAP Configuration', access: 'admin', url: 'admin/ldapConfiguration' },
  { id: 'U036', path: 'PIM > Configuration > Optional Fields', access: 'admin', url: 'pim/configurePim' },
  { id: 'U037', path: 'PIM > Configuration > Custom Fields', access: 'admin', url: 'pim/listCustomFields' },
  { id: 'U038', path: 'PIM > Configuration > Data Import', access: 'admin', url: 'pim/pimCsvImport' },
  { id: 'U039', path: 'PIM > Configuration > Reporting Methods', access: 'admin', url: 'pim/viewReportingMethods' },
  { id: 'U040', path: 'PIM > Configuration > Termination Reasons', access: 'admin', url: 'pim/viewTerminationReasons' },
  { id: 'U041', path: 'PIM > Add Employee', access: 'admin', url: 'pim/addEmployee' },
  { id: 'U042', path: 'PIM > Reports', access: 'admin', url: 'pim/viewDefinedPredefinedReports' },
  { id: 'U043', path: 'Leave > Apply', access: 'all', url: 'leave/applyLeave' },
  { id: 'U044', path: 'Leave > My Leave', access: 'all', url: 'leave/viewMyLeaveList' },
  { id: 'U045', path: 'Leave > Entitlements > Add Entitlements', access: 'admin', url: 'leave/addLeaveEntitlement' },
  { id: 'U046', path: 'Leave > Entitlements > Employee Entitlements', access: 'admin', url: 'leave/viewLeaveEntitlements' },
  { id: 'U047', path: 'Leave > Entitlements > My Entitlements', access: 'all', url: 'leave/viewMyLeaveEntitlements' },
  { id: 'U048', path: 'Leave > Reports > Leave Entitlements and Usage Report', access: 'admin', url: 'leave/viewLeaveBalanceReport' },
  { id: 'U049', path: 'Leave > Reports > My Leave Entitlements and Usage Report', access: 'all', url: 'leave/viewMyLeaveBalanceReport' },
  { id: 'U050', path: 'Leave > Configure > Leave Period', access: 'admin', url: 'leave/defineLeavePeriod' },
  { id: 'U051', path: 'Leave > Configure > Leave Types', access: 'admin', url: 'leave/leaveTypeList' },
  { id: 'U052', path: 'Leave > Configure > Work Week', access: 'admin', url: 'leave/defineWorkWeek' },
  { id: 'U053', path: 'Leave > Configure > Holidays', access: 'admin', url: 'leave/viewHolidayList' },
  { id: 'U054', path: 'Leave > Assign Leave', access: 'admin', url: 'leave/assignLeave' },
  { id: 'U055', path: 'Time > Timesheets > My Timesheets', access: 'all', url: 'time/viewMyTimesheet' },
  { id: 'U056', path: 'Time > Attendance > My Records', access: 'all', url: 'attendance/viewMyAttendanceRecord' },
  { id: 'U057', path: 'Time > Attendance > Punch In/Out', access: 'all', url: 'attendance/punchIn' },
  { id: 'U058', path: 'Time > Attendance > Employee Records', access: 'admin', url: 'attendance/viewAttendanceRecord' },
  { id: 'U059', path: 'Time > Attendance > Configuration', access: 'admin', url: 'attendance/configure' },
  { id: 'U060', path: 'Time > Reports > Project Reports', access: 'admin', url: 'time/displayProjectReportCriteria' },
  { id: 'U061', path: 'Time > Reports > Employee Reports', access: 'admin', url: 'time/displayEmployeeReportCriteria' },
  { id: 'U062', path: 'Time > Reports > Attendance Summary', access: 'admin', url: 'time/displayAttendanceSummaryReportCriteria' },
  { id: 'U063', path: 'Time > Project Info > Customers', access: 'admin', url: 'time/viewCustomers' },
  { id: 'U064', path: 'Time > Project Info > Projects', access: 'admin', url: 'time/viewProjects' },
  { id: 'U065', path: 'Recruitment > Vacancies', access: 'admin', url: 'recruitment/viewJobVacancy' },
  { id: 'U066', path: 'Performance > Configure > KPIs', access: 'admin', url: 'performance/searchKpi' },
  { id: 'U067', path: 'Performance > Configure > Trackers', access: 'admin', url: 'performance/viewPerformanceTracker' },
  { id: 'U068', path: 'Performance > Manage Reviews > Manage Reviews', access: 'admin', url: 'performance/searchPerformanceReview' },
  { id: 'U069', path: 'Performance > Manage Reviews > My Reviews', access: 'all', url: 'performance/myPerformanceReview' },
  { id: 'U070', path: 'Performance > My Trackers', access: 'all', url: 'performance/viewMyPerformanceTrackerList' },
  { id: 'U071', path: 'Performance > Employee Trackers', access: 'admin', url: 'performance/viewEmployeePerformanceTrackerList' },
  { id: 'U072', path: 'Claim > Configuration > Events', access: 'admin', url: 'claim/viewEvents' },
  { id: 'U073', path: 'Claim > Configuration > Expense Types', access: 'admin', url: 'claim/viewExpense' },
  { id: 'U074', path: 'Claim > Submit Claim', access: 'all', url: 'claim/submitClaim' },
  { id: 'U075', path: 'Claim > My Claims', access: 'all', url: 'claim/viewClaim' },
  { id: 'U076', path: 'Claim > Assign Claim', access: 'admin', url: 'claim/assignClaim' },
  { id: 'U081', path: 'Header > Support', access: 'all', url: 'help/support' },
  { id: 'U082', path: 'Header > Change Password', access: 'all', url: 'pim/updatePassword' },
  { id: 'U086', path: 'Maintenance > Purge Records > Candidate Records', access: 'admin', url: 'maintenance/purgeCandidateData' },
  { id: 'U087', path: 'Maintenance > Access Records', access: 'admin', url: 'maintenance/accessEmployeeData' },
  { id: 'U088', path: 'PIM > Employee > Personal Details', access: 'admin', url: async (p) => `pim/viewPersonalDetails/empNumber/${await me(p)}` },
  { id: 'U089', path: 'PIM > Employee > Contact Details', access: 'admin', url: async (p) => `pim/contactDetails/empNumber/${await me(p)}` },
  { id: 'U090', path: 'PIM > Employee > Emergency Contacts', access: 'admin', url: async (p) => `pim/viewEmergencyContacts/empNumber/${await me(p)}` },
  { id: 'U091', path: 'PIM > Employee > Dependents', access: 'admin', url: async (p) => `pim/viewDependents/empNumber/${await me(p)}` },
  { id: 'U092', path: 'PIM > Employee > Immigration', access: 'admin', url: async (p) => `pim/viewImmigration/empNumber/${await me(p)}` },
  { id: 'U093', path: 'PIM > Employee > Job', access: 'admin', url: async (p) => `pim/viewJobDetails/empNumber/${await me(p)}` },
  { id: 'U094', path: 'PIM > Employee > Salary', access: 'admin', url: async (p) => `pim/viewSalaryList/empNumber/${await me(p)}` },
  { id: 'U095', path: 'PIM > Employee > Report-to', access: 'admin', url: async (p) => `pim/viewReportToDetails/empNumber/${await me(p)}` },
  { id: 'U096', path: 'PIM > Employee > Qualifications', access: 'admin', url: async (p) => `pim/viewQualifications/empNumber/${await me(p)}` },
  { id: 'U097', path: 'PIM > Employee > Memberships', access: 'admin', url: async (p) => `pim/viewMemberships/empNumber/${await me(p)}` },
  { id: 'U099', path: 'PIM > Employee > Profile Picture', access: 'admin', url: async (p) => `pim/viewPhotograph/empNumber/${await me(p)}` },
  { id: 'U100', path: 'Recruitment > Candidate Detail & Status Workflow', access: 'admin', url: async (p) => {
    const id = (await api(p, 'recruitment/candidates?limit=1&offset=0'))?.data?.[0]?.id; return id ? `recruitment/addCandidate/${id}` : null; } },
  { id: 'U101', path: 'Recruitment > Vacancy Detail & Attachments', access: 'admin', url: async (p) => {
    const id = (await api(p, 'recruitment/vacancies?limit=1&offset=0'))?.data?.[0]?.id; return id ? `recruitment/addJobVacancy/${id}` : null; } },
  { id: 'U102', path: 'Performance > Review Evaluation (Admin/Supervisor)', access: 'admin', url: async (p) => {
    const rows = (await api(p, 'performance/manage/reviews?limit=50&offset=0'))?.data ?? [];
    const r = rows.find((x: { overallStatus?: { statusId?: number } }) => [2, 3, 4].includes(x.overallStatus?.statusId ?? 0));
    return r ? `performance/reviewEvaluateByAdmin/${r.id}` : null; } },
  { id: 'U104', path: 'Performance > Tracker Logs', access: 'admin', url: async (p) => {
    const id = (await api(p, 'performance/config/trackers?limit=1&offset=0'))?.data?.[0]?.id; return id ? `performance/addPerformanceTrackerLog/trackId/${id}` : null; } },
  { id: 'U105', path: 'Claim > Claim Detail (expenses, attachments, actions)', access: 'admin', url: async (p) => {
    const id = (await api(p, 'claim/employees/requests?limit=1&offset=0'))?.data?.[0]?.id; return id ? `claim/assignClaim/id/${id}` : null; } },
  { id: 'U106', path: 'Time > Timesheet Edit & Approval', access: 'all', url: async (p) => {
    await p.goto('/web/index.php/time/viewMyTimesheet'); // the visit creates the timesheet for a new user
    const id = (await api(p, 'time/timesheets/default'))?.data?.id; return id ? `time/editTimesheet/${id}` : null; } },
];

export async function resolveUnitUrl(page: Page, unit: PageUnit): Promise<string | null> {
  const rel = typeof unit.url === 'string' ? unit.url : await unit.url(page);
  return rel ? `/web/index.php/${rel}` : null;
}
