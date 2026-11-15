/**
 * Wraps a mutation to GLOBAL, shared application config (Leave Period, Work Week, Modules,
 * Attendance Configuration, Localization) so it's always restored afterward, even if the test
 * fails mid-way. Per this project's standing rule, any TC touching this class of shared config
 * must use this wrapper and must have explicit user sign-off first (see
 * docs/Execution-Plan.md rule R6) -- these settings affect every user of the shared demo, not
 * just this test run, unlike per-employee/per-record data the suite creates and owns.
 *
 * `backup` reads the current state (typically a GET), `restore` writes it back (typically a
 * PUT/POST with the backed-up values) -- both supplied by the caller since the shape differs per
 * config screen. `action` is the mutation under test, run between the two.
 */
export async function withConfigRestore<T>(
  backup: () => Promise<T>,
  restore: (snapshot: T) => Promise<void>,
  action: () => Promise<void>,
): Promise<void> {
  const snapshot = await backup();
  try {
    await action();
  } finally {
    await restore(snapshot);
  }
}
