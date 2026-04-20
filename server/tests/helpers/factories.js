const request = require('supertest');
const Restaurant = require('../../models/Restaurant');
const RestaurantAdmin = require('../../models/RestaurantAdmin');
const Recipe = require('../../models/Recipe');
const Report = require('../../models/Report');

async function signup(app, { email, password = 'Pass123!', full_name = 'Test User' } = {}) {
  const uniqueEmail = email || `user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const response = await request(app).post('/api/auth/signup').send({
    email: uniqueEmail,
    password,
    full_name,
  });

  return {
    response,
    token: response.body.token,
    user: response.body.user,
    email: uniqueEmail,
    password,
  };
}

async function createRestaurant(overrides = {}) {
  return Restaurant.create({
    name: overrides.name || 'Spice Garden',
    address: overrides.address || '123 Food Street',
    city: overrides.city || 'Lahore',
    latitude: overrides.latitude ?? 31.5204,
    longitude: overrides.longitude ?? 74.3587,
    rating: overrides.rating ?? 4.2,
    review_count: overrides.review_count ?? 12,
    ...overrides,
  });
}

async function createApprovedAdmin({ userId, restaurantId, overrides = {} }) {
  return RestaurantAdmin.create({
    user_id: userId,
    restaurant_name: overrides.restaurant_name || 'Spice Garden',
    government_registration_number: overrides.government_registration_number || `REG-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    cnic: overrides.cnic || `${Math.floor(Math.random() * 9000000000000) + 1000000000000}`,
    contact_number: overrides.contact_number || '+923001234567',
    address: overrides.address || '123 Food Street',
    city: overrides.city || 'Lahore',
    cuisine_types: overrides.cuisine_types || ['Pakistani'],
    status: 'approved',
    restaurant_id: restaurantId,
    ...overrides,
  });
}

async function createRecipeForUser({ userId, overrides = {} }) {
  return Recipe.create({
    title: overrides.title || `Test Recipe ${Date.now()}`,
    description: overrides.description || 'Test recipe for white-box testing',
    ingredients: overrides.ingredients || ['Chicken', 'Salt'],
    instructions: overrides.instructions || ['Mix ingredients', 'Cook for 20 minutes'],
    author_id: userId,
    ...overrides,
  });
}

async function createReport({ reporterId, reviewId, restaurantId, reportType = 'restaurant_review' }) {
  return Report.create({
    reporter_id: reporterId,
    report_type: reportType,
    review_id: reviewId,
    restaurant_id: restaurantId,
    reason: 'Offensive content',
  });
}

module.exports = {
  signup,
  createRestaurant,
  createApprovedAdmin,
  createRecipeForUser,
  createReport,
};
