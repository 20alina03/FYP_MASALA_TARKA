import { test, expect } from '@playwright/test';
import { mockJson, setAuthenticatedSession } from './helpers/frontend';

test('home page shows the authenticated dashboard state', async ({ page }) => {
  await setAuthenticatedSession(page);
  await mockJson(page, '**/api/restaurants/admin/status', { status: 'approved' });

  await page.goto('/home');

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { name: /find-out/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Discover Restaurants' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go to Dashboard' })).toBeVisible();
});

test('home page switches button states for pending and rejected admins', async ({ page }) => {
  await setAuthenticatedSession(page);

  await mockJson(page, '**/api/restaurants/admin/status', { status: 'pending' });
  await page.goto('/home');
  await expect(page.getByRole('button', { name: 'Request Pending' })).toBeVisible();
});

test('home page shows resubmit action for rejected admins', async ({ page }) => {
  await setAuthenticatedSession(page);

  await mockJson(page, '**/api/restaurants/admin/status', { status: 'rejected' });
  await page.goto('/home');
  await expect(page.getByRole('button', { name: 'Resubmit Request' })).toBeVisible();
});

test('unknown routes show the not found page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recipe Not Found!' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to Kitchen' })).toBeVisible();
});