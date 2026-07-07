import { expect, type Page } from '@playwright/test';

export const PILOT_PASSWORD = 'pilot123';
export const INSTITUTION_NAME = 'PES University';

export async function clearSession(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

export async function selectInstitution(page: Page): Promise<void> {
  const pickerBtn = page.getByRole('button', { name: 'Select institution' });
  await expect(pickerBtn).toBeVisible({ timeout: 30_000 });

  const alreadySelected = await page
    .getByText('Sign in with your college credentials')
    .isVisible()
    .catch(() => false);
  if (alreadySelected) {
    return;
  }

  await expect(pickerBtn).not.toContainText('Loading institutions', { timeout: 30_000 });
  await pickerBtn.click();

  const option = page.getByText(INSTITUTION_NAME, { exact: true });
  await expect(option).toBeVisible({ timeout: 10_000 });
  await option.click();

  await expect(page.getByText('Sign in with your college credentials')).toBeVisible({
    timeout: 10_000,
  });
}

export async function fillCredentials(page: Page, email: string, password: string): Promise<void> {
  const emailInput = page.getByPlaceholder('name@pes.edu');
  await expect(emailInput).toBeEditable({ timeout: 15_000 });
  await emailInput.fill(email);
  await page.getByPlaceholder('Password').fill(password);
}

export async function dismissOverlays(page: Page): Promise<void> {
  const closeBanner = page.getByText('✕');
  if (await closeBanner.isVisible().catch(() => false)) {
    await closeBanner.click();
  }
}

export async function acceptConsentIfShown(page: Page): Promise<void> {
  try {
    await page.waitForURL(/consent/, { timeout: 20_000 });
  } catch {
    return;
  }

  await dismissOverlays(page);

  const accept = page.getByText('I accept — continue');
  await expect(accept).toBeVisible({ timeout: 10_000 });
  await accept.click();

  await page.waitForURL((url) => !url.pathname.includes('consent'), { timeout: 30_000 });
  await dismissOverlays(page);
}

export async function loginAs(
  page: Page,
  email: string,
  options?: { waitForUrl?: RegExp },
): Promise<void> {
  await page.goto('/login');
  await selectInstitution(page);

  await fillCredentials(page, email, PILOT_PASSWORD);
  await page.getByText('Sign in →').click();

  await acceptConsentIfShown(page);

  if (options?.waitForUrl) {
    await page.waitForURL(options.waitForUrl, { timeout: 45_000 });
  }

  await dismissOverlays(page);
}

export async function signOut(page: Page): Promise<void> {
  await dismissOverlays(page);

  let signOutBtn = page.getByText('Sign out', { exact: true });
  if (!(await signOutBtn.isVisible().catch(() => false))) {
    await page.goto('/');
    await dismissOverlays(page);
    signOutBtn = page.getByText('Sign out', { exact: true });
  }

  await signOutBtn.scrollIntoViewIfNeeded();
  await expect(signOutBtn).toBeVisible({ timeout: 10_000 });
  await signOutBtn.click();
  await page.waitForURL(/\/login/, { timeout: 15_000 });
}
