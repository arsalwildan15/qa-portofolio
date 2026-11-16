import { type Page } from '@playwright/test';

/**
 * Dashboard widgets and the request behind each one (recorded LIVE 2026-11-16, Admin):
 * Admin sees 7 widgets; an ESS user sees 5 (no Employee Distribution charts, whose endpoints
 * answer an ESS session with 403).
 */
export const WIDGET_API = {
  timeAtWork: 'dashboard/employees/time-at-work',
  actions: 'dashboard/employees/action-summary',
  shortcuts: 'dashboard/shortcuts',
  buzz: 'buzz/feed',
  leaveToday: 'dashboard/employees/leaves',
  bySubunit: 'dashboard/employees/subunit',
  byLocation: 'dashboard/employees/locations',
} as const;

export const ADMIN_WIDGETS = ['Time at Work', 'My Actions', 'Quick Launch', 'Buzz Latest Posts', 'Employees on Leave Today',
  'Employee Distribution by Sub Unit', 'Employee Distribution by Location'];
export const ESS_WIDGETS = ADMIN_WIDGETS.slice(0, 5);

/** dashboard/shortcuts key -> Quick Launch button label. */
export const SHORTCUT_LABEL: Record<string, string> = {
  'leave.assign_leave': 'Assign Leave', 'leave.leave_list': 'Leave List', 'time.employee_timesheet': 'Timesheets',
  'leave.apply_leave': 'Apply Leave', 'leave.my_leave': 'My Leave', 'time.my_timesheet': 'My Timesheet',
};

/** The widget card is two nested .orangehrm-dashboard-widget elements holding the same content; take the outer one. */
export const widget = (page: Page, name: string) =>
  page.locator('.orangehrm-dashboard-widget').filter({ has: page.locator('.orangehrm-dashboard-widget-name', { hasText: name }) }).first();

export const widgetNames = async (page: Page) => (await page.locator('.orangehrm-dashboard-widget-name').allInnerTexts()).map((t) => t.trim());

/** Path + query of the widget request exactly as the page sends it (the browser supplies date/time/timezone). */
export function apiPathOf(url: string): string {
  return url.split('/api/v2/')[1] ?? '';
}
