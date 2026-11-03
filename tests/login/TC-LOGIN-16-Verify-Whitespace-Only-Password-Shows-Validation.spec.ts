import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-16 (-) Negative
 * Verify a whitespace-only password is treated as empty by the client
 * (trimmed), blocking submission with a "Required" validation message.
 */
test('TC-LOGIN-16: whitespace-only password shows validation error', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/auth/validate')) submitted = true;
  });

  await loginPage.login(env.username, '   ');

  await expect(loginPage.requiredValidationMessages).toHaveCount(1);
  expect(submitted).toBe(false);
});
