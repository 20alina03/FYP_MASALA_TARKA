const request = require('supertest');
const app = require('../index');
const MenuItem = require('../models/MenuItem');
const RestaurantAdmin = require('../models/RestaurantAdmin');
const RestaurantAdminRejected = require('../models/RestaurantAdminRejected');
const RestaurantReview = require('../models/RestaurantReview');
const UserRole = require('../models/UserRole');
const Report = require('../models/Report');
const { signup, createRestaurant, createApprovedAdmin } = require('./helpers/factories');

describe('Restaurant Registration + Super Admin + Menu Management White-Box Tests', () => {
  test('TC-19: Register a New Restaurant – Valid Data', async () => {
    const { token } = await signup(app, { email: 'tc19@example.com' });

    const response = await request(app)
      .post('/api/restaurants/admin/request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurant_name: 'TC19 Resto',
        government_registration_number: 'REG-TC19-001',
        cnic: '1111122222333',
        contact_number: '+923001111111',
        address: 'Main Boulevard',
        city: 'Lahore',
        description: 'Family restaurant',
        cuisine_types: ['Pakistani'],
      });

    expect(response.status).toBe(201);
    expect(response.body.request.status).toBe('pending');
  });

  test('TC-20: Register a New Restaurant – Incomplete Information', async () => {
    const { token } = await signup(app, { email: 'tc20@example.com' });

    const response = await request(app)
      .post('/api/restaurants/admin/request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurant_name: 'TC20 Incomplete',
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toHaveProperty('error');
  });

  test('TC-21: Approve Restaurant Registration', async () => {
    const { token: requesterToken, user: requester } = await signup(app, { email: 'tc21-user@example.com' });
    const { token: superToken } = await signup(app, {
      email: 'alinarafiq0676@gmail.com',
      password: 'SuperAdmin123!',
      full_name: 'Super Admin',
    });

    const submitRequest = await request(app)
      .post('/api/restaurants/admin/request')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        restaurant_name: 'TC21 Resto',
        government_registration_number: 'REG-TC21-001',
        cnic: '2222233333444',
        contact_number: '+923002222222',
        address: 'Street 21',
        city: 'Lahore',
        description: 'Approval flow test',
        cuisine_types: ['Pakistani'],
      });

    const requestId = submitRequest.body.request._id;

    const approveResponse = await request(app)
      .post(`/api/restaurants/superadmin/approve/${requestId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({});

    expect(approveResponse.status).toBe(200);

    const updatedRequest = await RestaurantAdmin.findById(requestId).lean();
    expect(updatedRequest.status).toBe('approved');

    const role = await UserRole.findOne({ user_id: requester.id }).lean();
    expect(role.role).toBe('admin');
  });

  test('TC-22: Reject Restaurant Registration', async () => {
    const { token: requesterToken } = await signup(app, { email: 'tc22-user@example.com' });
    const { token: superToken } = await signup(app, {
      email: 'alinarafiq0676@gmail.com',
      password: 'SuperAdmin123!',
      full_name: 'Super Admin',
    });

    const submitRequest = await request(app)
      .post('/api/restaurants/admin/request')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        restaurant_name: 'TC22 Resto',
        government_registration_number: 'REG-TC22-001',
        cnic: '3333344444555',
        contact_number: '+923003333333',
        address: 'Street 22',
        city: 'Lahore',
        description: 'Rejection flow test',
        cuisine_types: ['Fast Food'],
      });

    const requestId = submitRequest.body.request._id;

    const rejectResponse = await request(app)
      .post(`/api/restaurants/superadmin/reject/${requestId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({});

    expect(rejectResponse.status).toBe(200);

    const active = await RestaurantAdmin.findById(requestId).lean();
    expect(active).toBeNull();

    const rejected = await RestaurantAdminRejected.findOne({ government_registration_number: 'REG-TC22-001' }).lean();
    expect(rejected).not.toBeNull();
    expect(rejected.status).toBe('rejected');
  });

  test('TC-23: View Customer Reviews (Restaurant Owner)', async () => {
    const { token: ownerToken, user: owner } = await signup(app, { email: 'tc23-owner@example.com' });
    const { user: customer } = await signup(app, { email: 'tc23-customer@example.com' });

    const restaurant = await createRestaurant({ name: 'TC23 Resto' });
    await createApprovedAdmin({ userId: owner.id, restaurantId: restaurant._id });

    await RestaurantReview.create({
      restaurant_id: restaurant._id,
      user_id: customer.id,
      rating: 4,
      review_text: 'Very good overall experience',
      user_name: 'TC23 Customer',
    });

    const response = await request(app)
      .get('/api/restaurants/admin/my-restaurant')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.restaurant.name).toBe('TC23 Resto');
    expect(response.body.reviews.length).toBe(1);
  });

  test('TC-24: Delete Flagged Review (Sentiment Analysis)', async () => {
    const { token: superToken } = await signup(app, {
      email: 'alinarafiq0676@gmail.com',
      password: 'SuperAdmin123!',
      full_name: 'Super Admin',
    });

    const { token: adminToken, user: adminUser } = await signup(app, { email: 'tc24-admin@example.com' });
    const { user: customer } = await signup(app, { email: 'tc24-customer@example.com' });

    const restaurant = await createRestaurant({ name: 'TC24 Resto' });
    await createApprovedAdmin({ userId: adminUser.id, restaurantId: restaurant._id });

    const review = await RestaurantReview.create({
      restaurant_id: restaurant._id,
      user_id: customer.id,
      rating: 1,
      review_text: 'Bad and abusive content',
      sentiment: 'negative',
      user_name: 'TC24 Customer',
    });

    const reportResponse = await request(app)
      .post('/api/restaurants/admin/report')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        review_id: review._id,
        report_type: 'restaurant_review',
        reason: 'Flagged by sentiment analysis',
        restaurant_id: restaurant._id,
      });

    expect(reportResponse.status).toBe(201);

    const report = await Report.findOne({ review_id: review._id }).lean();

    const resolveResponse = await request(app)
      .post(`/api/restaurants/superadmin/reports/${report._id}/resolve`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        action: 'delete_review',
        resolution_note: 'Removed after moderation',
        block_user: false,
      });

    expect(resolveResponse.status).toBe(200);

    const deletedReview = await RestaurantReview.findById(review._id).lean();
    expect(deletedReview).toBeNull();
  });

  test('TC-25: Add Menu Items', async () => {
    const { token, user } = await signup(app, { email: 'tc25-admin@example.com' });
    const restaurant = await createRestaurant({ name: 'TC25 Resto' });
    await createApprovedAdmin({ userId: user.id, restaurantId: restaurant._id });

    const response = await request(app)
      .post('/api/restaurants/admin/menu')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Chicken Handi',
        description: 'Creamy handi',
        price: 650,
        is_available: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Chicken Handi');
  });

  test('TC-26: Edit Menu Items', async () => {
    const { token, user } = await signup(app, { email: 'tc26-admin@example.com' });
    const restaurant = await createRestaurant({ name: 'TC26 Resto' });
    await createApprovedAdmin({ userId: user.id, restaurantId: restaurant._id });

    const menuItem = await MenuItem.create({
      restaurant_id: restaurant._id,
      name: 'Beef Karahi',
      description: 'Original description',
      price: 1200,
      is_available: true,
    });

    const response = await request(app)
      .put(`/api/restaurants/admin/menu/${menuItem._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Updated description',
        price: 1100,
      });

    expect(response.status).toBe(200);
    expect(response.body.description).toBe('Updated description');
    expect(response.body.price).toBe(1100);
  });
});
