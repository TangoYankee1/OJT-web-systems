import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const { loadEnv, assertTest } = require('../../backend/src/config/env');
const { createPool } = require('../../backend/src/config/db');
const {
  createAccount: bootstrapAccount,
} = require('../../backend/src/modules/directories/directories.service');
const { one, rows } = require('../../backend/src/shared/repository');
const { localDate } = require('../../backend/src/shared/time');
const { referenceSeed } = require('../../backend/scripts/seed');
const tag = crypto.randomBytes(4).toString('hex'),
  temporary = 'Browser-initial-password-2026!',
  password = 'Browser-changed-password-2026!';
let pool, adminId, placementId;
const name = (role) => 'Browser ' + role + ' ' + tag,
  email = (role) => 'browser-' + role + '-' + tag + '@tests.invalid';
const shift = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return localDate(d);
};
test.beforeAll(async () => {
  const env = loadEnv('.env.test');
  assertTest(env);
  pool = createPool(env);
  await referenceSeed(pool);
  const u = await bootstrapAccount(
    pool,
    { role: 'admin', id: null },
    {
      email: email('admin'),
      fullName: name('admin'),
      role: 'admin',
      temporaryPassword: temporary,
      profile: {},
    },
  );
  adminId = u.id;
  await fs.mkdir(path.resolve('..', 'docs', 'evidence'), { recursive: true });
});
test.afterAll(async () => {
  await pool?.end();
});
async function signIn(page, role) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email(role));
  await page.getByLabel('Password', { exact: true }).fill(temporary);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/change-password/);
  await page.getByLabel('Current password', { exact: true }).fill(temporary);
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('Confirm new password').fill(password);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('Email address').fill(email(role));
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp('/' + (role === 'student2' ? 'student' : role) + '/dashboard'),
  );
}
async function createAccount(page, role) {
  await page.goto('/users');
  await page.getByRole('button', { name: '+ Create account', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create account' });
  await dialog.getByLabel('Full name', { exact: true }).fill(name(role));
  await dialog.getByLabel('Email', { exact: true }).fill(email(role));
  await dialog
    .getByLabel('Role', { exact: true })
    .selectOption(role === 'student2' ? 'student' : role);
  await dialog.getByLabel('Temporary password', { exact: true }).fill(temporary);
  if (role === 'faculty') {
    await dialog.getByLabel('Employee number').fill('BF-' + tag);
    await dialog.getByLabel('School department').selectOption({ label: 'Browser School ' + tag });
  }
  if (role.startsWith('student')) {
    await dialog.getByLabel('Student number').fill('BS-' + role + '-' + tag);
    await dialog.getByLabel('Program / course').fill('Information Technology');
    await dialog.getByLabel('Year level').fill('4');
    await dialog.getByLabel('School department').selectOption({ label: 'Browser School ' + tag });
  }
  if (role === 'supervisor')
    await (async () => {
      const options = await dialog
        .getByLabel('Company department')
        .locator('option')
        .allTextContents();
      await dialog
        .getByLabel('Company department')
        .selectOption({ label: options.find((x) => x.includes('Browser Host ' + tag)) });
    })();
  await dialog.getByRole('button', { name: 'Save account' }).click();
  await expect(dialog).not.toBeVisible();
}
async function assign(page, studentRole, type) {
  await page.goto('/placements/new');
  await page.getByLabel('Student', { exact: true }).selectOption({ label: name(studentRole) });
  await page.getByLabel('Academic term').selectOption({ label: '2097-2098 / ' + tag });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Deployment type').selectOption(type);
  await page.getByLabel('Assigned faculty').selectOption({ label: name('faculty') });
  if (type === 'company') {
    await page
      .getByLabel('Company department', { exact: true })
      .selectOption({ label: 'Browser Host ' + tag });
    await page.getByLabel('Assigned supervisor').selectOption({ label: name('supervisor') });
  } else
    await page
      .getByLabel('School host department')
      .selectOption({ label: 'Browser School ' + tag });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Start date').fill(shift(-10));
  await page.getByLabel('End date').fill(shift(60));
  await page.getByLabel('Required hours').fill('1');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Save placement', exact: true }).click();
  await expect(page).toHaveURL(/\/placements\/\d+$/);
  return Number(page.url().split('/').pop());
}
async function upload(page, pid, title) {
  await page.goto('/placements/' + pid);
  const card = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: new RegExp(title) }) });
  await card.getByRole('button', { name: 'Upload file' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Select a file').setInputFiles({
    name: 'synthetic.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nBrowser synthetic document\n%%EOF'),
  });
  await dialog.getByRole('button', { name: 'Submit file' }).click();
  await expect(dialog).not.toBeVisible();
}
async function approveDocument(page, pid, title) {
  await page.goto('/placements/' + pid);
  const card = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: new RegExp(title) }) });
  await card.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(card.locator('.badge')).toHaveText('approved');
}
async function transition(page, pid, button) {
  await page.goto('/placements/' + pid);
  await page.getByRole('button', { name: button, exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByRole('button', { name: 'Confirm transition' }).click();
  await expect(d).not.toBeVisible();
}
async function duty(student, reviewer, pid) {
  await student.goto('/schedules?placementId=' + pid);
  await student.getByRole('button', { name: '+ Log duty' }).click();
  const d = student.getByRole('dialog');
  await d.getByLabel('Clock in (Asia/Manila)').fill(shift(-1) + 'T08:00');
  await d.getByLabel('Clock out (Asia/Manila)').fill(shift(-1) + 'T17:00');
  await d.getByLabel('Break minutes').fill('60');
  await d.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(d).not.toBeVisible();
  await student.getByRole('button', { name: 'Submit', exact: true }).click();
  await student.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(student.getByRole('dialog')).not.toBeVisible();
  await reviewer.goto('/schedules?placementId=' + pid);
  await reviewer.getByRole('button', { name: 'Approve', exact: true }).click();
  await reviewer.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(reviewer.getByRole('dialog')).not.toBeVisible();
}
async function evaluations(author, faculty, pid) {
  for (const type of ['midterm', 'final']) {
    await author.goto('/evaluations?placementId=' + pid);
    await author.getByRole('button', { name: '+ Start ' + type, exact: true }).click();
    const d = author.getByRole('dialog');
    const fields = d.locator('input[type=number]');
    await expect(fields).toHaveCount(2);
    await fields.nth(0).fill('45');
    await fields.nth(1).fill('36');
    await d.getByRole('button', { name: 'Save draft' }).click();
    await expect(d).not.toBeVisible();
    const row = author
      .getByRole('row')
      .filter({ has: author.getByRole('cell', { name: type, exact: true }) });
    await row.getByRole('button', { name: 'Submit', exact: true }).click();
    await author.getByRole('dialog').getByRole('button', { name: 'Confirm submit' }).click();
    await expect(author.getByRole('dialog')).not.toBeVisible();
    await faculty.goto('/evaluations?placementId=' + pid);
    const frow = faculty
      .getByRole('row')
      .filter({ has: faculty.getByRole('cell', { name: type, exact: true }) });
    await frow.getByRole('button', { name: 'Finalize', exact: true }).click();
    await faculty.getByRole('dialog').getByRole('button', { name: 'Confirm finalize' }).click();
    await expect(faculty.getByRole('dialog')).not.toBeVisible();
  }
}
test(
  'company and school workflows through the browser, all roles, refresh, routes and mobile',
  { timeout: 240000 },
  async ({ browser, page: admin }) => {
    const contexts = [];
    try {
      await signIn(admin, 'admin');
      await admin.goto('/school-departments');
      await admin.getByRole('button', { name: '+ Add school department' }).click();
      await admin
        .getByRole('dialog')
        .getByLabel('Department code')
        .fill('B-' + tag);
      await admin
        .getByRole('dialog')
        .getByLabel('Department name')
        .fill('Browser School ' + tag);
      await admin.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
      await expect(admin.getByRole('dialog')).not.toBeVisible();
      await admin.goto('/settings');
      await admin.getByRole('button', { name: '+ Add academic term' }).click();
      let d = admin.getByRole('dialog');
      await d.getByLabel('Academic year').fill('2097-2098');
      await d.getByLabel('Semester').fill(tag);
      await d.getByLabel('Start date').fill(shift(-30));
      await d.getByLabel('End date').fill(shift(100));
      await d.getByRole('button', { name: 'Save changes' }).click();
      await expect(d).not.toBeVisible();
      await admin
        .getByRole('row')
        .filter({ hasText: tag })
        .getByRole('button', { name: 'Make current' })
        .click();
      await admin.goto('/companies');
      await admin.getByRole('button', { name: '+ Add company', exact: true }).click();
      d = admin.getByRole('dialog');
      await d.getByLabel('Company name').fill('Browser Company ' + tag);
      await d.getByLabel('Address', { exact: true }).fill('Synthetic test address');
      await d.getByRole('button', { name: 'Save changes' }).click();
      await expect(d).not.toBeVisible();
      await admin
        .getByRole('row')
        .filter({ hasText: 'Browser Company ' + tag })
        .getByRole('button', { name: 'Departments', exact: true })
        .click();
      await admin.getByRole('button', { name: '+ Add department', exact: true }).click();
      d = admin.getByRole('dialog', { name: 'Add department', exact: true });
      await d.getByLabel('Department name').fill('Browser Host ' + tag);
      await d.getByRole('button', { name: 'Save changes' }).click();
      await expect(d).not.toBeVisible();
      await admin
        .getByRole('dialog')
        .getByRole('button', { name: 'Close dialog', exact: true })
        .click();
      for (const role of ['faculty', 'supervisor', 'student', 'student2'])
        await createAccount(admin, role);
      placementId = await assign(admin, 'student', 'company');
      const pages = {};
      for (const role of ['faculty', 'supervisor', 'student', 'student2']) {
        const c = await browser.newContext();
        contexts.push(c);
        const p = await c.newPage();
        pages[role] = p;
        await signIn(p, role);
        await p.screenshot({
          path: path.resolve('..', 'docs', 'evidence', role + '-dashboard.png'),
          fullPage: true,
        });
      }
      const { faculty, supervisor, student, student2 } = pages;
      await upload(student, placementId, 'Consent form');
      await approveDocument(faculty, placementId, 'Consent form');
      await transition(faculty, placementId, 'Approve placement');
      await transition(admin, placementId, 'Activate placement');
      await duty(student, supervisor, placementId);
      await evaluations(supervisor, faculty, placementId);
      await upload(student, placementId, 'Final report');
      await approveDocument(faculty, placementId, 'Final report');
      await transition(faculty, placementId, 'Complete placement');
      await admin.goto('/reports?search=' + encodeURIComponent(name('student')));
      await expect(admin.getByRole('cell', { name: 'completed', exact: true })).toBeVisible();
      const downloadPromise = admin.waitForEvent('download');
      await admin.getByRole('link', { name: 'Export CSV' }).click();
      const download = await downloadPromise;
      expect(await download.failure()).toBeNull();
      const schoolId = await assign(admin, 'student2', 'school');
      await upload(student2, schoolId, 'Consent form');
      await approveDocument(faculty, schoolId, 'Consent form');
      await transition(faculty, schoolId, 'Approve placement');
      await transition(admin, schoolId, 'Activate placement');
      await duty(student2, faculty, schoolId);
      await evaluations(faculty, faculty, schoolId);
      await upload(student2, schoolId, 'Final report');
      await approveDocument(faculty, schoolId, 'Final report');
      await transition(faculty, schoolId, 'Complete placement');
      for (const url of [
        '/admin/dashboard',
        '/placements',
        '/placements/new',
        '/requirements',
        '/reviews/requirements',
        '/schedules',
        '/evaluation-criteria',
        '/evaluations',
        '/students',
        '/faculty',
        '/companies',
        '/school-departments',
        '/reports',
        '/settings',
        '/users',
        '/help',
        '/audit-logs',
      ]) {
        await admin.goto(url);
        await expect(admin.locator('main#main h1')).toBeVisible();
        await expect(admin.getByText('We could not complete that request')).toHaveCount(0);
      }
      await admin.goto('/admin/dashboard');
      await admin.reload();
      await expect(admin).toHaveURL(/admin\/dashboard/);
      await admin.screenshot({
        path: path.resolve('..', 'docs', 'evidence', 'admin-dashboard.png'),
        fullPage: true,
      });
      await admin.setViewportSize({ width: 390, height: 844 });
      await admin.getByRole('button', { name: 'Toggle navigation' }).click();
      await expect(admin.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      await admin.screenshot({
        path: path.resolve('..', 'docs', 'evidence', 'mobile-navigation.png'),
        fullPage: true,
      });
      await student.goto('/users');
      await expect(student.getByText('This page is not available to your role.')).toBeVisible();
      await student.goto('/student/dashboard');
      await student.getByRole('button', { name: 'Sign out', exact: true }).click();
      await expect(student).toHaveURL(/login/);
      await student.goto('/my/requirements');
      await expect(student).toHaveURL(/login/);
    } finally {
      for (const c of contexts) await c.close();
    }
  },
);
