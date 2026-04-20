const request = require('supertest');
const app = require('../index');
const MenuItem = require('../models/MenuItem');
const { createRestaurant } = require('./helpers/factories');

describe('Restaurant Discovery White-Box Tests', () => {
  test('TC-15: Filter Restaurants by Area – Valid Location', async () => {
    await createRestaurant({
      name: 'Nearby Resto',
      latitude: 31.5204,
      longitude: 74.3587,
      cuisines: ['Pakistani'],
    });

    await createRestaurant({
      name: 'Far Away Resto',
      latitude: 33.6844,
      longitude: 73.0479,
      cuisines: ['Pakistani'],
    });

    const response = await request(app).get('/api/restaurants/discover').query({
      latitude: 31.5204,
      longitude: 74.3587,
      radius: 5,
    });

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    expect(response.body.some((r) => r.name === 'Nearby Resto')).toBe(true);
  });

  test('TC-16: Filter Restaurants by Area – Invalid Location', async () => {
    await createRestaurant({
      name: 'Location Parsing Resto',
      latitude: 31.5204,
      longitude: 74.3587,
    });

    const response = await request(app).get('/api/restaurants/discover').query({
      latitude: 'abc',
      longitude: 'xyz',
      radius: 10,
    });

    // Current implementation yields empty results when coordinates are non-numeric.
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  test('TC-17: Get AI Recommendations – Matching Results', async () => {
    const restaurant = await createRestaurant({
      name: 'Recommendation Resto',
      rating: 4.8,
      review_count: 100,
    });

    await MenuItem.create({
      restaurant_id: restaurant._id,
      name: 'Chicken Biryani',
      description: 'Main course biryani',
      price: 450,
      is_available: true,
      rating: 4.7,
      review_count: 20,
    });

    await MenuItem.create({
      restaurant_id: restaurant._id,
      name: 'Mint Raita Side',
      description: 'Side dish',
      price: 120,
      is_available: true,
      rating: 4.5,
      review_count: 10,
    });

    const response = await request(app)
      .post('/api/restaurants/optimized-menu')
      .send({
        budget: 1000,
        includeCourses: ['main', 'side'],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.recommendedMenus.length).toBeGreaterThan(0);
  });

  test('TC-18: Get AI Recommendations – No Matching Restaurants', async () => {
    const restaurant = await createRestaurant({
      name: 'Too Expensive Resto',
      rating: 4.3,
    });

    await MenuItem.create({
      restaurant_id: restaurant._id,
      name: 'Premium Main Platter',
      description: 'Main course',
      price: 9000,
      is_available: true,
      rating: 4.1,
      review_count: 8,
    });

    const response = await request(app)
      .post('/api/restaurants/optimized-menu')
      .send({
        budget: 500,
        includeCourses: ['main'],
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
