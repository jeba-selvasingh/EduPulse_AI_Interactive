import { test, expect } from '@playwright/test';
import {
  clearSession,
  loginAs,
  signOut,
} from '../helpers/auth';

/**
 * Single-session pilot demo: faculty → principal → student → TPO.
 * Run with: ../scripts/run-automated-demo.sh
 */
test('EduPulse pilot walkthrough', async ({ page }) => {
  await test.step('Faculty — Paper Craft', async () => {
    await clearSession(page);
    await loginAs(page, 'faculty@pes.edu');
    await expect(page.getByText(/Good morning/i)).toBeVisible();
    await expect(page.getByText('Paper Craft')).toBeVisible();
    await page.getByText('Paper Craft').first().click();
    await expect(page.getByText('Generate question paper')).toBeVisible();
    await expect(page.getByText('BCS304 · Data Structures · SEE')).toBeVisible();
    await page.goBack();
    await signOut(page);
  });

  await test.step('Principal — Dean Pulse & College Radar', async () => {
    await clearSession(page);
    await loginAs(page, 'principal@pes.edu', { waitForUrl: /dean-pulse/ });
    await expect(page.getByText('Institution pulse')).toBeVisible();
    await expect(page.getByText('Predicted placement')).toBeVisible();
    await page.getByText('View College Radar →').click();
    await expect(page.getByText('📡 College Radar')).toBeVisible();
    await page.goBack();
    await signOut(page);
  });

  await test.step('Student — Academic Level', async () => {
    await clearSession(page);
    await loginAs(page, 'student@pes.edu');
    await expect(page.getByText('Academic Level')).toBeVisible();
    await page.getByText('Academic Level').first().click();
    await expect(page.getByText('Chetan R · Academic level')).toBeVisible();
    await page.goBack();
    await signOut(page);
  });

  await test.step('TPO — Campus Recruitment', async () => {
    await clearSession(page);
    await loginAs(page, 'tpo@pes.edu', { waitForUrl: /campus-drive/ });
    await expect(page.getByText('Campus Recruitment')).toBeVisible();
    await expect(page.getByText('2027 batch')).toBeVisible();
    await signOut(page);
  });
});
