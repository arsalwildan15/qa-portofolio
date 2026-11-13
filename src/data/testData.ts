export function uniqueEmployeeName(prefix: string): { firstName: string; lastName: string } {
  const suffix = Date.now().toString().slice(-6);
  return { firstName: prefix, lastName: `QA${suffix}` };
}

/** Collision-free name for master data created against the shared demo (custom fields, reporting methods, termination reasons, reports). */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString().slice(-6)}`;
}

/** Collision-free email for Recruitment candidates created against the shared demo. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}${Date.now().toString().slice(-6)}@example.com`.toLowerCase();
}

/**
 * Returns a leave date, offset by a run-unique number of days into the future to avoid
 * colliding with dates used by earlier test runs against the shared OrangeHRM demo
 * backend (reusing a date triggers an "Overlapping Leave Request" confirmation dialog
 * instead of a direct success toast). Formatted as yyyy-dd-mm, matching the Apply Leave form.
 */
export function futureLeaveDate(daysFromNow: number): string {
  const runOffset = Math.floor(Date.now() / 1000) % 1000;
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow + runOffset);
  const yyyy = date.getFullYear();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${dd}-${mm}`;
}

/**
 * Returns a date for the Leave module specifically, offset by a SMALL run-unique number of
 * days (0-20) rather than futureLeaveDate()'s up-to-999-day spread. Leave Entitlements are
 * scoped to a specific Leave Period (typically the current calendar year) -- a date pushed
 * too far out by futureLeaveDate() can land in a FUTURE leave period with no entitlement at
 * all, confirmed live: POST /api/v2/leave/leave-requests returns 400 and the Apply Leave
 * page silently shows 0.00 Day(s) balance for a leave type that actually has an
 * entitlement, just not for that far-future period. Keeping the offset small (0-20 days)
 * keeps the date safely inside the current leave period while still avoiding exact-date
 * collision with a previous run's leave request for the same employee+leave type.
 */
/** Days remaining until Dec 31 of the current year, from today. Used to cap random leave-date offsets so they can never spill into a future Leave Period that has no entitlement. */
function daysUntilYearEnd(): number {
  const today = new Date();
  const yearEnd = new Date(today.getFullYear(), 11, 31);
  return Math.max(1, Math.floor((yearEnd.getTime() - today.getTime()) / 86_400_000));
}

export function uniqueLeaveDate(daysFromNow: number): string {
  // Random, not time-based: two calls microseconds apart (e.g. consecutive isolated test
  // runs launched seconds apart) previously got the IDENTICAL offset from
  // Math.floor(Date.now()/1000) % 20, since that only changes once every ~20 real seconds --
  // confirmed live, this caused back-to-back runs to silently collide on the exact same
  // date and hit an unhandled "Overlapping Leave Request" dialog instead of a clean submit.
  // The pool is capped to NOT spill past Dec 31 of the current year -- confirmed live, a
  // date in a future Leave Period (e.g. Jan next year) reads as 0.00 balance even though
  // the current year's entitlement is large, since entitlements are assigned per-period.
  const maxOffset = Math.max(1, Math.min(150, daysUntilYearEnd() - daysFromNow - 1));
  const runOffset = Math.floor(Math.random() * maxOffset);
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow + runOffset);
  const yyyy = date.getFullYear();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${dd}-${mm}`;
}

/**
 * Same as uniqueLeaveDate(), but nudged forward (at most +2 days) to guarantee it never
 * lands on a Saturday/Sunday -- Leave auto-excludes weekend days from balance deduction
 * (confirmed live), so a TC specifically asserting "balance decreased by exactly N" must
 * not risk silently landing on a weekend day and deducting 0 instead.
 */
export function uniqueLeaveWeekday(daysFromNow: number): string {
  const maxOffset = Math.max(1, Math.min(150, daysUntilYearEnd() - daysFromNow - 3));
  const runOffset = Math.floor(Math.random() * maxOffset);
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow + runOffset);
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 6) date.setDate(date.getDate() + 2);
  if (day === 0) date.setDate(date.getDate() + 1);
  const yyyy = date.getFullYear();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${dd}-${mm}`;
}
