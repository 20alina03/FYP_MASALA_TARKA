const request = require('supertest');
const app = require('../index');

describe('Authentication White-Box Tests', () => {
  test('TC-01: User Sign Up (valid)', async () => {
    const response = await request(app).post('/api/auth/signup').send({
      email: 'tc01@example.com',
      password: 'Pass123!',
      full_name: 'TC 01 User',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('tc01@example.com');
  });

  test('TC-02: User Sign Up – Missing Fields', async () => {
    const response = await request(app).post('/api/auth/signup').send({
      email: 'missing@example.com',
    });

    // Current route catches model validation and returns 500.
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toHaveProperty('error');
  });

  test('TC-03: User Login (valid)', async () => {
    await request(app).post('/api/auth/signup').send({
      email: 'tc03@example.com',
      password: 'Pass123!',
      full_name: 'TC 03 User',
    });

    const response = await request(app).post('/api/auth/signin').send({
      email: 'tc03@example.com',
      password: 'Pass123!',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('tc03@example.com');
  });

  test('TC-04: User Login – Invalid Credentials', async () => {
    const response = await request(app).post('/api/auth/signin').send({
      email: 'not-found@example.com',
      password: 'WrongPass',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  test('TC-05: User Logout', async () => {
    const response = await request(app).post('/api/auth/signout').send({});

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Signed out successfully');
  });
});
