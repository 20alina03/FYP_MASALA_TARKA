import { test, expect } from '@playwright/test';
import { mockJson, setAuthenticatedSession } from './helpers/frontend';

test('feed page loads community recipes and filters them by search', async ({ page }) => {
  await setAuthenticatedSession(page);

  await mockJson(page, '**/api/recipes', [
    {
      _id: 'recipe-1',
      title: 'Chicken Biryani',
      description: 'Fragrant rice and chicken.',
      cuisine: 'Pakistani',
      difficulty: 'Medium',
      ingredients: ['Rice'],
      instructions: ['Cook rice'],
    },
    {
      _id: 'recipe-2',
      title: 'Mango Lassi',
      description: 'Cool summer drink.',
      cuisine: 'Indian',
      difficulty: 'Easy',
      ingredients: ['Mango'],
      instructions: ['Blend'],
    },
  ]);
  await mockJson(page, '**/api/recipe_likes', []);
  await mockJson(page, '**/api/recipe_comments', []);
  await mockJson(page, '**/api/recipe_books', []);

  await page.goto('/feed');

  await expect(page.getByRole('heading', { name: 'Recipe Community' })).toBeVisible();
  await expect(page.getByText('Chicken Biryani')).toBeVisible();
  await expect(page.getByText('Mango Lassi')).toBeVisible();

  await page.getByPlaceholder('Search recipes...').fill('biryani');
  await expect(page.getByText('Chicken Biryani')).toBeVisible();
  await expect(page.getByText('Mango Lassi')).toHaveCount(0);
});

test('generated recipes page shows recipes, filters them, and saves to book', async ({ page }) => {
  await setAuthenticatedSession(page);

  await mockJson(page, '**/api/generated_recipes', [
    {
      _id: 'gen-1',
      title: 'Paneer Wrap',
      description: 'A quick wrap for lunch.',
      cooking_time: 20,
      servings: 2,
      cuisine: 'Indian',
      difficulty: 'Easy',
      ingredients: ['Paneer'],
      instructions: ['Assemble'],
    },
    {
      _id: 'gen-2',
      title: 'Spicy Pasta',
      description: 'Creamy and hot.',
      cooking_time: 25,
      servings: 3,
      cuisine: 'Italian',
      difficulty: 'Medium',
      ingredients: ['Pasta'],
      instructions: ['Boil'],
    },
  ]);

  let saveCalled = false;
  await page.route('**/api/generated_recipe_books', async (route) => {
    if (route.request().method() === 'POST') {
      saveCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('/generated-recipes');

  await expect(page.getByRole('heading', { name: 'Your Generated Recipes' })).toBeVisible();
  await expect(page.getByText('Paneer Wrap')).toBeVisible();
  await expect(page.getByText('Spicy Pasta')).toBeVisible();

  await page.getByPlaceholder('Search generated recipes...').fill('paneer');
  await expect(page.getByText('Paneer Wrap')).toBeVisible();
  await expect(page.getByText('Spicy Pasta')).toHaveCount(0);

  await page.getByPlaceholder('Search generated recipes...').fill('');
  await page.getByRole('button', { name: 'Save' }).first().click();
  await expect.poll(() => saveCalled).toBeTruthy();
  await expect(page.getByText('Saved to recipe book')).toBeVisible();
});

test('recipe book page lists saved recipes and shows PDF action', async ({ page }) => {
  await setAuthenticatedSession(page);

  await mockJson(page, '**/api/recipe_books', [
    {
      _id: 'book-1',
      recipe_id: {
        _id: 'recipe-1',
        title: 'Chicken Karahi',
        description: 'A classic curry.',
        cooking_time: 35,
        servings: 4,
        cuisine: 'Pakistani',
        difficulty: 'Medium',
      },
    },
  ]);
  await mockJson(page, '**/api/generated_recipe_books', []);

  await page.goto('/recipe-book');

  await expect(page.getByRole('heading', { name: 'Your Recipe Book' })).toBeVisible();
  await expect(page.getByText('Chicken Karahi')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();

  await page.getByPlaceholder('Search saved recipes...').fill('karahi');
  await expect(page.getByText('Chicken Karahi')).toBeVisible();
});