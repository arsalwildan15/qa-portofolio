import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-15 (-) Negative
 * Verify a whitespace-only username is treated as empty by the client
 * (trimmed), blocking submission with a "Required" validation message.
 */
test('TC-LOGIN-15: whitespace-only username shows validation error', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/auth/validate')) submitted = true;
  });

  await loginPage.login('   ', 'admin123');

  await expect(loginPage.requiredValidationMessages).toHaveCount(1);
  expect(submitted).toBe(false);
});
