import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const { loadEnv, assertTest } = require('../../backend/src/config/env');
const { createPool } = require('../../backend/src/config/db');
const { createAccount } = require('../../backend/src/modules/directories/directories.service');
const { rows } = require('../../backend/src/shared/repository');
const tag = crypto.randomBytes(4).toString('hex'),
  password = 'Browser-ui-state-password-2026!';
let pool, user;
test.beforeAll(async () => {
  const env = loadEnv('.env.test');
  assertTest(env);
  pool = createPool(env);
  user = await createAccount(
    pool,
    { role: 'admin', id: null },
    {
      email: 'browser-ui-' + tag + '@tests.invalid',
      fullName: 'Browser UI ' + tag,
      role: 'admin',
      temporaryPassword: password,
      profile: {},
    },
  );
  await rows(pool, 'UPDATE users SET must_change_password=0 WHERE id=?', [user.id]);
});
test.afterAll(async () => {
  await pool?.end();
});
test('keyboard modal focus, empty state, error retry, mobile width and API JSON fallback', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/admin\/dashboard/);
  await page.goto('/companies');
  const add = page.getByRole('button', { name: '+ Add company', exact: true });
  await add.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Add company', exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(() =>
    document.querySelector('dialog[open]')?.contains(document.activeElement),
  );
  expect(inside).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(add).toBeFocused();
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('no-such-company-' + tag);
  await expect(page.getByText('No records yet', { exact: true })).toBeVisible();
  await page.route('**/api/companies?*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'NOT_READY', message: 'Synthetic connection interruption' },
      }),
    }),
  );
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('Synthetic connection interruption', { exact: true })).toBeVisible();
  await page.unroute('**/api/companies?*');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('No records yet', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: 'Monitoring dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Placement activity' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const api = await page.request.get('/api/no-such-route');
  expect(api.status()).toBe(404);
  expect(api.headers()['content-type']).toContain('application/json');
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
