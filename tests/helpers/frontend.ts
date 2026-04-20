import type { Page } from '@playwright/test';

export const authenticatedUser = {
  id: 'user-1',
  email: 'tester@example.com',
  full_name: 'Frontend Tester',
};

export async function setAuthenticatedSession(page: Page, user = authenticatedUser) {
  await page.addInitScript((sessionUser) => {
    localStorage.setItem('mongodb_token', 'test-token');
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('mongodb_user', JSON.stringify(sessionUser));
  }, user);
}

export async function setRestaurantLocation(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('userLocation', JSON.stringify({ lat: 31.5204, lng: 74.3587 }));
    localStorage.setItem('manualLocationName', 'Gulberg, Lahore');
    localStorage.setItem('locationMode', 'manual');
    localStorage.setItem('searchRadius', '15');
    localStorage.setItem('token', 'test-token');
  });
}

export async function mockJson(page: Page, url: string, body: unknown, status = 200) {
  await page.route(url, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}