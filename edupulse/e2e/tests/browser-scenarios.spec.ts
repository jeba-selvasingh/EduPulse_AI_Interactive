import { test, expect } from '@playwright/test';
import {
  clearSession,
  loginAs,
  selectInstitution,
  fillCredentials,
  signOut,
  PILOT_PASSWORD,
} from '../helpers/auth';

test.describe('Auth & consent', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('login page loads with institution picker and SSO option', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('UNIVERSITY')).toBeVisible();
    await expect(page.getByText('Select your institution')).toBeVisible();
    await expect(page.getByPlaceholder('name@pes.edu')).toBeVisible();
    await expect(page.getByText('College SSO (Keycloak)')).toBeVisible();
    await expect(page.getByText('Secured by Keycloak')).toBeVisible();
  });

  test('invalid credentials show an error', async ({ page }) => {
    await page.goto('/login');
    await selectInstitution(page);
    await fillCredentials(page, 'nobody@pes.edu', 'wrong-password');
    await page.getByText('Sign in →').click();
    await expect(page.getByText(/invalid|failed|unauthorized|credentials/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('consent policy loads after sign-in', async ({ page }) => {
    await page.goto('/login');
    await selectInstitution(page);
    await fillCredentials(page, 'faculty@pes.edu', PILOT_PASSWORD);
    await page.getByText('Sign in →').click();
    await page.waitForURL(/consent/, { timeout: 20_000 });
    await expect(page.getByText('Data Processing Notice (DPDP)')).toBeVisible();
    await expect(page.getByText(/Version/i)).toBeVisible();
    await expect(page.getByText('Decline')).toBeVisible();
  });
});

test.describe('Faculty workflows', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('faculty lands on home with greeting and quick actions', async ({ page }) => {
    await loginAs(page, 'faculty@pes.edu');
    await expect(page.getByText(/Good morning/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Paper Craft')).toBeVisible();
    await expect(page.getByText('Dept. of CSE')).toBeVisible();
  });

  test('faculty can open Paper Craft', async ({ page }) => {
    await loginAs(page, 'faculty@pes.edu');
    await page.getByText('Paper Craft').first().click();
    await expect(page.getByText('Generate question paper')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('BCS304 · Data Structures · SEE')).toBeVisible();
  });

  test('faculty can sign out', async ({ page }) => {
    await loginAs(page, 'faculty@pes.edu');
    await signOut(page);
    await expect(page.getByText('Sign in →')).toBeVisible();
  });
});

test.describe('Principal workflows', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('principal lands on Dean Pulse', async ({ page }) => {
    await loginAs(page, 'principal@pes.edu', { waitForUrl: /dean-pulse/ });
    await expect(page.getByText('Institution pulse')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Predicted placement')).toBeVisible();
  });

  test('principal can open College Radar', async ({ page }) => {
    await loginAs(page, 'principal@pes.edu', { waitForUrl: /dean-pulse/ });
    await page.getByText('View College Radar →').click();
    await expect(page.getByText('📡 College Radar')).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('TPO workflows', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('TPO lands on Campus Recruitment home', async ({ page }) => {
    await loginAs(page, 'tpo@pes.edu', { waitForUrl: /campus-drive/ });
    await expect(page.getByText('Campus Recruitment')).toBeVisible();
    await expect(page.getByText('2027 batch')).toBeVisible();
  });
});

test.describe('Student workflows', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('student home shows Academic Level quick action', async ({ page }) => {
    await loginAs(page, 'student@pes.edu');
    await expect(page.getByText(/Good morning/i)).toBeVisible();
    await expect(page.getByText('Academic Level')).toBeVisible();
  });

  test('student can open Academic Level', async ({ page }) => {
    await loginAs(page, 'student@pes.edu');
    await page.getByText('Academic Level').first().click();
    await expect(page.getByText('Chetan R · Academic level')).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Admin & moderator access', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('admin can sign in and reach home', async ({ page }) => {
    await loginAs(page, 'admin@pes.edu');
    await expect(page.getByText(/Good morning/i)).toBeVisible();
  });

  test('moderator can sign in and reach home', async ({ page }) => {
    await loginAs(page, 'moderator@pes.edu');
    await expect(page.getByText(/Good morning/i)).toBeVisible();
  });
});
