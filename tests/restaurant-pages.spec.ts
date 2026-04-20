import { test, expect } from '@playwright/test';
import { mockJson, setAuthenticatedSession, setRestaurantLocation } from './helpers/frontend';

test('restaurant discovery page loads nearby restaurants and opens optimized menu modal', async ({ page }) => {
  await setAuthenticatedSession(page);
  await setRestaurantLocation(page);

  await mockJson(page, '**/api/restaurants/discover', [
    {
      _id: 'rest-1',
      name: 'Al Noor Grill',
      city: 'Lahore',
      address: 'Main Boulevard',
      cuisine_types: ['Pakistani'],
      latitude: 31.5204,
      longitude: 74.3587,
      menu_items_preview: [
        { name: 'BBQ Platter', price: 1200, rating: 4.5 },
      ],
    },
  ]);

  await page.goto('/restaurants');

  await expect(page.getByRole('heading', { name: 'Discover Restaurants' })).toBeVisible();
  await expect(page.getByText('Al Noor Grill')).toBeVisible();
  await expect(page.getByPlaceholder('Search by name, city, or address...')).toBeVisible();

  await page.getByRole('button', { name: 'View Optimized Menu' }).click();
  await expect(page.getByRole('heading', { name: 'Optimized Menu' })).toBeVisible();
  await expect(page.getByText("What's your budget?" )).toBeVisible();
});

test('admin dashboard renders the approved restaurant management view', async ({ page }) => {
  await setAuthenticatedSession(page);

  await mockJson(page, '**/api/restaurants/admin/status', { status: 'approved', restaurant_id: 'rest-1' });
  await mockJson(page, '**/api/restaurants/admin/my-restaurant', {
    restaurant: {
      _id: 'rest-1',
      name: 'Al Noor Grill',
      contact_number: '123456789',
      address: 'Main Boulevard',
      city: 'Lahore',
      description: 'Family restaurant',
      cuisine_types: ['Pakistani'],
      government_registration_number: 'GRN-123',
      cnic: '35201-1234567-8',
    },
    menu_items: [
      { _id: 'menu-1', name: 'BBQ Platter', price: 1200 },
    ],
    reviews: [
      { _id: 'review-1', rating: 4, is_reported: false },
    ],
    menu_reviews: [
      { _id: 'menu-review-1', rating: 5, is_reported: true },
    ],
  });
  await mockJson(page, '**/api/restaurants/admin/notifications', [
    { _id: 'notif-1', title: 'Discount approved', message: 'Your menu discount is live.', is_read: false, created_at: '2026-04-20T10:00:00.000Z' },
  ]);

  await page.goto('/admin-dashboard');

  await expect(page.getByRole('heading', { name: 'Restaurant Admin Dashboard' })).toBeVisible();
  await expect(page.getByText('Managed by Al Noor Grill')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Menu Items (1)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recommendations & Alerts' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Change Password' })).toBeVisible();

  await page.getByRole('tab', { name: 'Restaurant Info' }).click();
  await expect(page.getByText('Restaurant Information')).toBeVisible();
  await expect(page.getByText('GRN-123')).toBeVisible();

  await page.getByRole('tab', { name: 'Change Password' }).click();
  await expect(page.getByPlaceholder('Enter new password')).toBeVisible();
});