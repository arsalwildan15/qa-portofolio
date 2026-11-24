/**
 * Time test-data helpers (API-level). Endpoints & bodies recorded LIVE 17 Nov 2026:
 *   attendance config  GET/PUT attendance/configs {canUserChangeCurrentTime,
 *                      canUserModifyAttendance, canSupervisorModifyAttendance}
 *   attendance records GET attendance/records (self); admin proxy via
 *                      AdminAttendanceRecordsPage (no direct deep link reliable)
 *   customers          GET/POST/PUT/<id>/DELETE time/customers {name, description}
 *   projects           GET/POST/PUT/<id>/DELETE time/projects
 *   timesheets (self)  GET time/employees/<empNumber>/timesheets
 *   timesheets (admin) PUT time/employees/<empNumber>/timesheets/<id> {action, comment?}
 *   reports            GET time/reports?name=<report>, GET time/reports/data?...&name=<report>
 * Every helper only touches records created by the calling test.
 */
import type { APIRequestContext } from '@playwright/test';

export const API = '/web/index.php/api/v2/';

export async function getJson<T = Record<string, unknown>>(req: APIRequestContext, path: string): Promise<T> {
  return ((await (await req.get(`${API}${path}`)).json()) as { data: T }).data;
}

export type AttendanceConfig = { canUserChangeCurrentTime: boolean; canUserModifyAttendance: boolean; canSupervisorModifyAttendance: boolean };
export async function currentAttendanceConfig(req: APIRequestContext): Promise<AttendanceConfig> {
  return getJson<AttendanceConfig>(req, 'attendance/configs');
}

export async function createCustomer(req: APIRequestContext, name: string, description = ''): Promise<number> {
  const r = await req.post(`${API}time/customers`, { data: { name, description } });
  const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
  if (!id) throw new Error(`createCustomer failed: ${r.status()} ${await r.text()}`);
  return id;
}

export async function createProject(req: APIRequestContext, customerId: number, name: string, description: string | null = null): Promise<number> {
  const r = await req.post(`${API}time/projects`, { data: { customerId, name, description } });
  const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
  if (!id) throw new Error(`createProject failed: ${r.status()} ${await r.text()}`);
  return id;
}

export async function deleteCustomers(req: APIRequestContext, ids: Array<number | undefined>): Promise<void> {
  const real = ids.filter((x): x is number => typeof x === 'number');
  if (real.length) await req.delete(`${API}time/customers`, { data: { ids: real } }).catch(() => null);
}
export async function deleteProjects(req: APIRequestContext, ids: Array<number | undefined>): Promise<void> {
  const real = ids.filter((x): x is number => typeof x === 'number');
  if (real.length) await req.delete(`${API}time/projects`, { data: { ids: real } }).catch(() => null);
}

/**
 * Self Punch In -- POST to the COLLECTION endpoint (no id in the URL), confirmed live
 * 24 Nov 2026. Returns the new record's id. Body shape confirmed via the real "In" button
 * on Time > Attendance > Punch In/Out (page.on('request')).
 */
export async function punchIn(
  req: APIRequestContext,
  date: string,
  time: string,
  note: string | null = null,
  timezoneOffset = 7,
  timezoneName = 'Asia/Jakarta',
): Promise<number> {
  const r = await req.post(`${API}attendance/records`, { data: { date, time, note, timezoneOffset, timezoneName } });
  const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
  if (!id) throw new Error(`punchIn failed: ${r.status()} ${await r.text()}`);
  return id;
}

/**
 * Self Punch Out -- ALSO PUT to the collection endpoint (no id): the server closes
 * whichever punch is currently open for the caller, confirmed live 24 Nov 2026 (the UI's
 * "Out" button does not know/send the open record's id either).
 */
export async function punchOut(
  req: APIRequestContext,
  date: string,
  time: string,
  note: string | null = null,
  timezoneOffset = 7,
  timezoneName = 'Asia/Jakarta',
): Promise<import('@playwright/test').APIResponse> {
  return req.put(`${API}attendance/records`, { data: { date, time, note, timezoneOffset, timezoneName } });
}

export async function deleteAttendanceRecords(req: APIRequestContext, ids: Array<number | undefined>): Promise<void> {
  const real = ids.filter((x): x is number => typeof x === 'number');
  if (real.length) await req.delete(`${API}attendance/records`, { data: { ids: real } }).catch(() => null);
}

/**
 * Admin proxy Punch In on behalf of ANOTHER employee -- confirmed live 25 Nov 2026 via
 * page.on('request') while clicking "Add" -> "In" on Time > Attendance > Employee Records
 * (AdminAttendanceRecordsPage): POST to the NESTED collection endpoint
 * attendance/employees/<empNumber>/records (NOT the plain attendance/records used by
 * self-service punchIn/punchOut above). Body shape is otherwise identical. Returns the new
 * record's id.
 */
export async function proxyPunchIn(
  req: APIRequestContext,
  empNumber: number,
  date: string,
  time: string,
  note: string | null = null,
  timezoneOffset = 7,
  timezoneName = 'Asia/Jakarta',
): Promise<number> {
  const r = await req.post(`${API}attendance/employees/${empNumber}/records`, { data: { date, time, note, timezoneOffset, timezoneName } });
  const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
  if (!id) throw new Error(`proxyPunchIn failed: ${r.status()} ${await r.text()}`);
  return id;
}

/**
 * Admin-side bulk delete of attendance records belonging to a SPECIFIC employee -- confirmed
 * live 25 Nov 2026 via the real trash-icon "Yes, Delete" flow on Employee Records: DELETE
 * attendance/employees/<empNumber>/records {ids:[...]} (scoped by path empNumber, NOT the
 * plain attendance/records {ids} used by self-service deleteAttendanceRecords above).
 */
export async function deleteEmployeeAttendanceRecords(req: APIRequestContext, empNumber: number, ids: Array<number | undefined>): Promise<void> {
  const real = ids.filter((x): x is number => typeof x === 'number');
  if (real.length) await req.delete(`${API}attendance/employees/${empNumber}/records`, { data: { ids: real } }).catch(() => null);
}
