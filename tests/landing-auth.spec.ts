import { test, expect } from '@playwright/test';

test('landing page lets users move to auth and reveal sample recipes', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /find-out/i })).toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole('heading', { name: 'Recipe Community' })).toBeVisible();

  await page.goto('/');
  await page.getByRole('button', { name: 'Try Sample Recipe' }).click();
  await expect(page.getByRole('heading', { name: 'Sample Recipes' })).toBeVisible();
});

test('auth page exposes sign-in and sign-up forms', async ({ page }) => {
  await page.goto('/auth');

  await expect(page.getByRole('heading', { name: 'Recipe Community' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();

  await page.getByRole('tab', { name: 'Sign Up' }).click();
  await expect(page.getByLabel('Full Name')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});