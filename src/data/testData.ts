export function uniqueEmployeeName(prefix: string): { firstName: string; lastName: string } {
  const suffix = Date.now().toString().slice(-6);
  return { firstName: prefix, lastName: `QA${suffix}` };
}

/** Collision-free name for master data created against the shared demo (custom fields, reporting methods, termination reasons, reports). */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now().toString().slice(-6)}`;
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
