import { type Page } from '@playwright/test';
import { type AdminUsersPage } from '../pages/AdminUsersPage';
import { uniqueName } from '../data/testData';

/**
 * Creates a System User via Admin > User Management > Add, retrying with a fresh suffix
 * on a "Already exists" username collision -- confirmed live 2026-11-12: a plain
 * uniqueName() suffix occasionally collides against usernames left over from earlier test
 * runs on this shared public demo. Same retry rationale as createTestEmployee(), different
 * trigger condition (username collision, not auto-generated Employee Id collision).
 */
export async function createTestUser(
  page: Page,
  adminUsersPage: AdminUsersPage,
  namePrefix: string,
): Promise<{ username: string; userId: number }> {
  let username = uniqueName(namePrefix);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await adminUsersPage.gotoAdd();
    await adminUsersPage.usernameInput.fill(username);
    await adminUsersPage.selectUserRole('ESS');
    await adminUsersPage.fillFirstEmployeeName();
    await adminUsersPage.selectStatus('Enabled');
    await adminUsersPage.passwordInput.fill('Passw0rd!2026');
    await adminUsersPage.confirmPasswordInput.fill('Passw0rd!2026');

    const responsePromise = page
      .waitForResponse((r) => r.url().includes('/api/v2/admin/users') && r.request().method() === 'POST', {
        timeout: 10_000,
      })
      .catch(() => null);
    await adminUsersPage.save();
    const resp = await responsePromise;

    if (resp && resp.status() === 200) {
      const body = await resp.json().catch(() => null);
      if (body?.data?.id) {
        return { username, userId: body.data.id };
      }
    }

    if (attempt < 3) {
      username = `${username}_${Date.now()}`;
      continue;
    }
    throw new Error(`createTestUser: Save did not produce a usable 200 response after ${attempt} attempt(s)`);
  }
  throw new Error('createTestUser: unreachable');
}
