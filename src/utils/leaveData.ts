/**
 * Leave test-data helpers (API-level). Endpoints & bodies recorded LIVE 17 Nov 2026:
 *   leave period   GET/PUT leave/leave-period {startMonth, startDay}
 *   work week      GET/PUT leave/workweek {monday..sunday: 0|8}
 *   holidays       GET leave/holidays, POST/PUT/<id>/DELETE leave/holidays {name,date,length,recurring}
 *   entitlements   GET/POST leave/leave-entitlements {empNumber,leaveTypeId,fromDate,toDate,entitlement}
 *                  (POST is an UPSERT that ADDS to any existing value for the same employee +
 *                  leave type + leave period -- confirmed live via the "Existing Entitlement
 *                  value X will be updated to Y" confirm dialog, Y = X + new days. Correct,
 *                  documented behaviour, not a bug.)
 *   leave requests apply (self)  POST leave/leave-requests {leaveTypeId,fromDate,toDate,comment,duration:{type}}
 *                  assign (admin) POST leave/employees/leave-requests {empNumber,leaveTypeId,fromDate,toDate,comment,duration:{type}}
 *                  admin list/actions GET leave/employees/leave-requests, PUT leave/employees/leave-requests/<id> {action}
 *   reports        GET leave/reports?name=<report>, GET leave/reports/data?...&name=<report>
 *                  names: my_leave_entitlements_and_usage (ESS), leave_type_leave_entitlements_and_usage (admin, needs leaveTypeId)
 * Every helper only touches records created by the calling test.
 */
import type { APIRequestContext } from '@playwright/test';

export const API = '/web/index.php/api/v2/';

export async function getJson<T = Record<string, unknown>>(req: APIRequestContext, path: string): Promise<T> {
  return ((await (await req.get(`${API}${path}`)).json()) as { data: T }).data;
}

export async function firstLeaveTypeId(req: APIRequestContext): Promise<number> {
  const types = ((await (await req.get(`${API}leave/leave-types?limit=0`)).json()) as { data: Array<{ id: number }> }).data;
  const id = types[0]?.id;
  if (!id) throw new Error('firstLeaveTypeId: no leave types found');
  return id;
}

/**
 * The ACTUAL fromDate/toDate the server will use for leave-entitlements right now --
 * confirmed live 17 Nov 2026: POST leave/leave-entitlements IGNORES whatever fromDate/toDate
 * the client sends and always echoes back the server's own CURRENT global Leave Period bounds
 * (`meta.currentLeavePeriod`), so a GET query with a hardcoded/guessed date range can miss the
 * row entirely if the global period has since drifted (shared config, see withConfigRestore).
 * Every GET by date range in this file's callers should use this instead of a literal string.
 */
export async function currentPeriodRange(req: APIRequestContext): Promise<{ fromDate: string; toDate: string }> {
  const r = await req.get(`${API}leave/leave-period`);
  const body = (await r.json()) as { meta: { currentLeavePeriod: { startDate: string; endDate: string } } };
  return { fromDate: body.meta.currentLeavePeriod.startDate, toDate: body.meta.currentLeavePeriod.endDate };
}

/** Grants `days` entitlement (ADDITIVE upsert). fromDate/toDate are cosmetic -- see `currentPeriodRange`. */
export async function grantEntitlement(req: APIRequestContext, empNumber: number, leaveTypeId: number, days: string, fromDate = '2026-01-01', toDate = '2026-12-31') {
  return req.post(`${API}leave/leave-entitlements`, { data: { empNumber, leaveTypeId, entitlement: days, fromDate, toDate } });
}

export async function createHoliday(req: APIRequestContext, name: string, date: string, over: Record<string, unknown> = {}): Promise<number> {
  const r = await req.post(`${API}leave/holidays`, { data: { name, date, length: 0, recurring: false, ...over } });
  const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
  if (!id) throw new Error(`createHoliday failed: ${r.status()} ${await r.text()}`);
  return id;
}

export async function deleteHolidays(req: APIRequestContext, ids: Array<number | undefined>): Promise<void> {
  const real = ids.filter((x): x is number => typeof x === 'number');
  if (real.length) await req.delete(`${API}leave/holidays`, { data: { ids: real } }).catch(() => null);
}

export async function cleanupLeave(req: APIRequestContext, empNumbers: Array<number | undefined>, holidayIds: Array<number | undefined> = []): Promise<void> {
  await deleteHolidays(req, holidayIds);
  const emps = empNumbers.filter((x): x is number => typeof x === 'number');
  if (emps.length) await req.delete(`${API}pim/employees`, { data: { ids: emps } }).catch(() => null);
}

/**
 * Reads back Leave Period / Work Week so a mutating test can restore the original value
 * afterward. Leave Period's GET also returns a read-only `createdAt` -- confirmed live, PUTting
 * it back verbatim is REJECTED (422 "createdAt"), unlike a true mass-assignment hole; only the
 * two writable fields are kept here so backup() -> restore() round-trips cleanly.
 */
export async function currentLeavePeriod(req: APIRequestContext): Promise<{ startMonth: number; startDay: number }> {
  const d = await getJson<{ startMonth: number; startDay: number }>(req, 'leave/leave-period');
  return { startMonth: d.startMonth, startDay: d.startDay };
}
export async function currentWorkWeek(req: APIRequestContext): Promise<Record<string, number>> {
  return getJson(req, 'leave/workweek');
}
