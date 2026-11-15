/**
 * Primary API endpoints per menu unit, taken from the LIVE API inventory
 * (tools/coverage/api-discovery.json: every GET /api/v2/* each menu page actually issued,
 * 2026-11-15). Used by the API sweep tests in tests/_global/sweep/.
 *
 * list   : the unit's own list endpoint (path + base query the page uses)
 * paged  : the page sends limit/offset (pagination parameters apply)
 * sorted : the page sends sortField/sortOrder
 * detail : single-record path with {id}. NOT trusted blindly -- the sweep first fetches a real id
 *          from `list` and requires 200 as a control before testing a non-existent id.
 */
export interface ApiUnit {
  id: string;
  path: string;
  list: string;
  paged: boolean;
  sorted: boolean;
  detail?: string;
}

export const API_UNITS: ApiUnit[] = [
  { id: 'U001', path: 'Admin > User Management > Users', list: 'admin/users?limit=50&offset=0&sortField=u.userName&sortOrder=ASC', paged: true, sorted: true, detail: 'admin/users/{id}' },
  { id: 'U002', path: 'PIM > Employee List', list: 'pim/employees?limit=50&offset=0&model=detailed&includeEmployees=onlyCurrent&sortField=employee.firstName&sortOrder=ASC', paged: true, sorted: true, detail: 'pim/employees/{id}' },
  { id: 'U003', path: 'Leave > Leave List', list: 'leave/employees/leave-requests?limit=50&offset=0&includeEmployees=onlyCurrent', paged: true, sorted: false },
  { id: 'U004', path: 'Time > Timesheets > Employee Timesheets', list: 'time/employees/timesheets/list?limit=50&offset=0', paged: true, sorted: false },
  { id: 'U005', path: 'Recruitment > Candidates', list: 'recruitment/candidates?limit=50&offset=0&model=list&sortField=candidate.dateOfApplication&sortOrder=DESC', paged: true, sorted: true, detail: 'recruitment/candidates/{id}' },
  { id: 'U007', path: 'Performance > Manage Reviews > Employee Reviews', list: 'performance/employees/reviews?limit=50&offset=0&sortField=performanceReview.statusId&sortOrder=ASC&includeEmployees=onlyCurrent', paged: true, sorted: true },
  { id: 'U009', path: 'Directory', list: 'directory/employees?limit=14&offset=0', paged: true, sorted: false },
  { id: 'U011', path: 'Claim > Employee Claims', list: 'claim/employees/requests?limit=50&offset=0&includeEmployees=onlyCurrent&sortField=claimRequest.referenceId&sortOrder=DESC', paged: true, sorted: true, detail: 'claim/requests/{id}' },
  { id: 'U012', path: 'Buzz', list: 'buzz/feed?limit=10&offset=0&sortOrder=DESC&sortField=share.createdAtUtc', paged: true, sorted: true },
  { id: 'U013', path: 'Admin > Job > Job Titles', list: 'admin/job-titles?limit=50&offset=0&sortField=jt.jobTitleName&sortOrder=ASC', paged: true, sorted: true, detail: 'admin/job-titles/{id}' },
  { id: 'U014', path: 'Admin > Job > Pay Grades', list: 'admin/pay-grades?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/pay-grades/{id}' },
  { id: 'U015', path: 'Admin > Job > Employment Status', list: 'admin/employment-statuses?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/employment-statuses/{id}' },
  { id: 'U016', path: 'Admin > Job > Job Categories', list: 'admin/job-categories?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/job-categories/{id}' },
  { id: 'U017', path: 'Admin > Job > Work Shifts', list: 'admin/work-shifts?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/work-shifts/{id}' },
  { id: 'U019', path: 'Admin > Organization > Locations', list: 'admin/locations?limit=50&offset=0&sortField=location.name&sortOrder=ASC', paged: true, sorted: true, detail: 'admin/locations/{id}' },
  { id: 'U021', path: 'Admin > Qualifications > Skills', list: 'admin/skills?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/skills/{id}' },
  { id: 'U022', path: 'Admin > Qualifications > Education', list: 'admin/educations?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/educations/{id}' },
  { id: 'U023', path: 'Admin > Qualifications > Licenses', list: 'admin/licenses?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/licenses/{id}' },
  { id: 'U024', path: 'Admin > Qualifications > Languages', list: 'admin/languages?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/languages/{id}' },
  { id: 'U025', path: 'Admin > Qualifications > Memberships', list: 'admin/memberships?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/memberships/{id}' },
  { id: 'U026', path: 'Admin > Nationalities', list: 'admin/nationalities?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/nationalities/{id}' },
  { id: 'U029', path: 'Admin > Configuration > Email Subscriptions', list: 'admin/email-subscriptions?limit=50&offset=0', paged: true, sorted: false },
  { id: 'U031', path: 'Admin > Configuration > Language Packages', list: 'admin/i18n/languages?limit=50&offset=0&sortOrder=ASC&activeOnly=true', paged: true, sorted: false },
  { id: 'U033', path: 'Admin > Configuration > Social Media Authentication', list: 'auth/openid-providers?limit=50&offset=0', paged: true, sorted: false, detail: 'auth/openid-providers/{id}' },
  { id: 'U034', path: 'Admin > Configuration > Register OAuth Client', list: 'admin/oauth-clients?limit=50&offset=0', paged: true, sorted: false, detail: 'admin/oauth-clients/{id}' },
  { id: 'U037', path: 'PIM > Configuration > Custom Fields', list: 'pim/custom-fields?limit=50&offset=0', paged: true, sorted: false, detail: 'pim/custom-fields/{id}' },
  { id: 'U039', path: 'PIM > Configuration > Reporting Methods', list: 'pim/reporting-methods?limit=50&offset=0', paged: true, sorted: false, detail: 'pim/reporting-methods/{id}' },
  { id: 'U040', path: 'PIM > Configuration > Termination Reasons', list: 'pim/termination-reasons?limit=50&offset=0', paged: true, sorted: false, detail: 'pim/termination-reasons/{id}' },
  { id: 'U042', path: 'PIM > Reports', list: 'pim/reports/defined?limit=50&offset=0&sortField=report.name&sortOrder=ASC', paged: true, sorted: true, detail: 'pim/reports/defined/{id}' },
  { id: 'U044', path: 'Leave > My Leave', list: 'leave/leave-requests?limit=50&offset=0&includeEmployees=onlyCurrent', paged: true, sorted: false, detail: 'leave/leave-requests/{id}' },
  { id: 'U047', path: 'Leave > Entitlements > My Entitlements', list: 'leave/leave-entitlements?limit=50&offset=0', paged: true, sorted: false, detail: 'leave/leave-entitlements/{id}' },
  { id: 'U051', path: 'Leave > Configure > Leave Types', list: 'leave/leave-types?limit=50&offset=0', paged: true, sorted: false, detail: 'leave/leave-types/{id}' },
  { id: 'U053', path: 'Leave > Configure > Holidays', list: 'leave/holidays?limit=50&offset=0&fromDate=2026-01-01&toDate=2026-12-31', paged: true, sorted: false, detail: 'leave/holidays/{id}' },
  { id: 'U056', path: 'Time > Attendance > My Records', list: 'attendance/records?limit=50&offset=0', paged: true, sorted: false },
  { id: 'U058', path: 'Time > Attendance > Employee Records', list: 'attendance/employees/summary?limit=50&offset=0', paged: true, sorted: false },
  { id: 'U063', path: 'Time > Project Info > Customers', list: 'time/customers?limit=50&offset=0&sortField=customer.name&sortOrder=ASC', paged: true, sorted: true, detail: 'time/customers/{id}' },
  { id: 'U064', path: 'Time > Project Info > Projects', list: 'time/projects?limit=50&offset=0&sortField=project.name&sortOrder=ASC&model=detailed', paged: true, sorted: true, detail: 'time/projects/{id}' },
  { id: 'U065', path: 'Recruitment > Vacancies', list: 'recruitment/vacancies?limit=50&offset=0&sortField=vacancy.name&sortOrder=ASC&model=detailed', paged: true, sorted: true, detail: 'recruitment/vacancies/{id}' },
  { id: 'U066', path: 'Performance > Configure > KPIs', list: 'performance/kpis?limit=50&offset=0&sortField=kpi.title&sortOrder=ASC', paged: true, sorted: true, detail: 'performance/kpis/{id}' },
  { id: 'U067', path: 'Performance > Configure > Trackers', list: 'performance/config/trackers?limit=50&offset=0&sortField=performanceTracker.modifiedDate&sortOrder=DESC', paged: true, sorted: true, detail: 'performance/config/trackers/{id}' },
  { id: 'U068', path: 'Performance > Manage Reviews > Manage Reviews', list: 'performance/manage/reviews?limit=50&offset=0&sortField=performanceReview.statusId&sortOrder=ASC&includeEmployees=onlyCurrent', paged: true, sorted: true, detail: 'performance/manage/reviews/{id}' },
  { id: 'U069', path: 'Performance > Manage Reviews > My Reviews', list: 'performance/reviews?limit=50&offset=0&sortField=performanceReview.statusId&sortOrder=ASC', paged: true, sorted: true },
  { id: 'U070', path: 'Performance > My Trackers', list: 'performance/trackers?limit=50&offset=0&sortField=performanceTracker.modifiedDate&sortOrder=DESC', paged: true, sorted: true },
  { id: 'U071', path: 'Performance > Employee Trackers', list: 'performance/employees/trackers?limit=50&offset=0&sortField=tracker.modifiedDate&sortOrder=DESC&includeEmployees=onlyCurrent', paged: true, sorted: true, detail: 'performance/employees/trackers/{id}' },
  { id: 'U072', path: 'Claim > Configuration > Events', list: 'claim/events?limit=50&offset=0&sortField=claimEvent.name&sortOrder=ASC', paged: true, sorted: true, detail: 'claim/events/{id}' },
  { id: 'U073', path: 'Claim > Configuration > Expense Types', list: 'claim/expenses/types?limit=50&offset=0&sortField=expenseType.name&sortOrder=ASC', paged: true, sorted: true, detail: 'claim/expenses/types/{id}' },
  { id: 'U075', path: 'Claim > My Claims', list: 'claim/requests?limit=50&offset=0&sortField=claimRequest.referenceId&sortOrder=DESC', paged: true, sorted: true, detail: 'claim/requests/{id}' },
];

/** Replaces or appends a query parameter in a relative API path. */
export function withParam(path: string, key: string, value: string): string {
  const [base, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${base}?${params.toString()}`;
}
