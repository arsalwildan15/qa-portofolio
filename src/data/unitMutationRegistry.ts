import { type Page } from '@playwright/test';

/**
 * Create/update/delete contract per simple "named entity" menu, captured LIVE on 2026-11-16:
 * POST <endpoint> with `body(name)` -> 200; PUT <endpoint>/<id> with the same shape -> 200;
 * DELETE <endpoint> {ids:[id]} -> 200. Work Shift's body was recorded from the real Add form.
 * Used by tests/_global/sweep/TC-SWEEP-MUT-01 (data-driven mutation checks per menu).
 *
 * uniqueName: the app treats the name as unique (the Add form answers "Already exists").
 *             KPIs are the exception -- duplicate KPI names are allowed by design (TC-PERF-KPI-05).
 */
export interface MutationUnit {
  id: string;
  path: string;
  endpoint: string;
  nameKey: 'name' | 'title';
  uniqueName: boolean;
  body: (name: string, ctx: MutationContext) => Record<string, unknown>;
}

export interface MutationContext { jobTitleId: number }

export async function mutationContext(page: Page): Promise<MutationContext> {
  const jt = await (await page.request.get('/web/index.php/api/v2/admin/job-titles?limit=1')).json().catch(() => null);
  return { jobTitleId: (jt as { data?: Array<{ id: number }> } | null)?.data?.[0]?.id ?? 0 };
}

const named = (id: string, path: string, endpoint: string, extra: Record<string, unknown> = {}): MutationUnit =>
  ({ id, path, endpoint, nameKey: 'name', uniqueName: true, body: (name) => ({ name, ...extra }) });

export const MUTATION_UNITS: MutationUnit[] = [
  { id: 'U013', path: 'Admin > Job > Job Titles', endpoint: 'admin/job-titles', nameKey: 'title', uniqueName: true, body: (name) => ({ title: name }) },
  named('U014', 'Admin > Job > Pay Grades', 'admin/pay-grades'),
  named('U015', 'Admin > Job > Employment Status', 'admin/employment-statuses'),
  named('U016', 'Admin > Job > Job Categories', 'admin/job-categories'),
  named('U017', 'Admin > Job > Work Shifts', 'admin/work-shifts', { hoursPerDay: '8.00', startTime: '09:00', endTime: '17:00', empNumbers: [] }),
  named('U019', 'Admin > Organization > Locations', 'admin/locations', { countryCode: 'US' }),
  named('U021', 'Admin > Qualifications > Skills', 'admin/skills'),
  named('U022', 'Admin > Qualifications > Education', 'admin/educations'),
  named('U023', 'Admin > Qualifications > Licenses', 'admin/licenses'),
  named('U024', 'Admin > Qualifications > Languages', 'admin/languages'),
  named('U025', 'Admin > Qualifications > Memberships', 'admin/memberships'),
  named('U026', 'Admin > Nationalities', 'admin/nationalities'),
  named('U039', 'PIM > Configuration > Reporting Methods', 'pim/reporting-methods'),
  named('U040', 'PIM > Configuration > Termination Reasons', 'pim/termination-reasons'),
  named('U051', 'Leave > Configure > Leave Types', 'leave/leave-types', { situational: false }),
  named('U063', 'Time > Project Info > Customers', 'time/customers', { description: '' }),
  { id: 'U066', path: 'Performance > Configure > KPIs', endpoint: 'performance/kpis', nameKey: 'title', uniqueName: false,
    body: (name, ctx) => ({ title: name, jobTitleId: ctx.jobTitleId, minRating: 0, maxRating: 100, isDefault: false }) },
  named('U072', 'Claim > Configuration > Events', 'claim/events', { description: '', status: true }),
  named('U073', 'Claim > Configuration > Expense Types', 'claim/expenses/types', { description: '', status: true }),
];
