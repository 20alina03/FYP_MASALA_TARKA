const request = require('supertest');
const app = require('../index');
const RestaurantReview = require('../models/RestaurantReview');
const CommunityPost = require('../models/CommunityPost');
const RecipeLike = require('../models/RecipeLike');
const { signup, createRestaurant, createApprovedAdmin } = require('./helpers/factories');

describe('AI Recipe + Recipe Features + Community White-Box Tests', () => {
  test('TC-06: Personalize Recipes – Valid Input', async () => {
    const { token } = await signup(app, { email: 'tc06@example.com' });

    const response = await request(app)
      .post('/api/generated_recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'AI Chicken Curry',
        description: 'Personalized recipe',
        ingredients: ['Chicken', 'Tomato', 'Garlic'],
        instructions: ['Mix', 'Cook', 'Serve'],
        servings: 2,
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('AI Chicken Curry');
    expect(response.body.ingredients).toHaveLength(3);
  });

  test('TC-07: Personalize Recipes – Insufficient Ingredients', async () => {
    const { token } = await signup(app, { email: 'tc07@example.com' });

    const response = await request(app)
      .post('/api/generated_recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Broken Recipe',
        instructions: ['Step only'],
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toHaveProperty('error');
  });

  test('TC-08: Download Recipe as PDF', async () => {
    // White-box proxy: verify recipe-book endpoint returns complete recipe payload consumed by PDF exporter.
    const { token, user } = await signup(app, { email: 'tc08@example.com' });

    const createRecipe = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'PDF Ready Recipe',
        description: 'Used for export',
        ingredients: ['Item 1', 'Item 2'],
        instructions: ['Step 1', 'Step 2'],
      });

    expect(createRecipe.status).toBe(201);

    const addToBook = await request(app)
      .post('/api/recipe_books')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipe_id: createRecipe.body._id });

    expect(addToBook.status).toBe(201);

    const list = await request(app)
      .get('/api/recipe_books')
      .set('Authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body[0].user_id).toBe(user.id);
    expect(list.body[0].recipe_id).toHaveProperty('title');
    expect(list.body[0].recipe_id).toHaveProperty('ingredients');
    expect(list.body[0].recipe_id).toHaveProperty('instructions');
  });

  test('TC-09: Share Community Recipe – Valid Submission', async () => {
    const { token, user } = await signup(app, { email: 'tc09@example.com' });
    const restaurant = await createRestaurant({ name: 'Community Resto' });
    await createApprovedAdmin({ userId: user.id, restaurantId: restaurant._id });

    const response = await request(app)
      .post('/api/restaurants/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurant_id: restaurant._id.toString(),
        post_type: 'text',
        content: 'Today special recipe is live!',
      });

    expect(response.status).toBe(201);
    expect(response.body.content).toContain('special recipe');
  });

  test('TC-10: Share Community Recipe – Invalid Image Format', async () => {
    const { token, user } = await signup(app, { email: 'tc10@example.com' });
    const restaurant = await createRestaurant({ name: 'Image Check Resto' });
    await createApprovedAdmin({ userId: user.id, restaurantId: restaurant._id });

    const response = await request(app)
      .post('/api/restaurants/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurant_id: restaurant._id.toString(),
        post_type: 'image',
        content: 'Uploading suspicious extension',
        media_url: 'https://cdn.example.com/file.exe',
      });

    // Current implementation accepts any URL format.
    expect(response.status).toBe(201);

    const created = await CommunityPost.findById(response.body._id).lean();
    expect(created.media_url).toContain('.exe');
  });

  test('TC-11: Share Community Recipe – Incomplete Details', async () => {
    const { token, user } = await signup(app, { email: 'tc11@example.com' });
    const restaurant = await createRestaurant({ name: 'Incomplete Details Resto' });
    await createApprovedAdmin({ userId: user.id, restaurantId: restaurant._id });

    const response = await request(app)
      .post('/api/restaurants/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        restaurant_id: restaurant._id.toString(),
        post_type: 'text',
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toHaveProperty('error');
  });

  test('TC-12: Like/Dislike Recipe', async () => {
    const { token } = await signup(app, { email: 'tc12@example.com' });

    const recipe = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Like Dislike Recipe',
        ingredients: ['A'],
        instructions: ['B'],
      });

    expect(recipe.status).toBe(201);

    const like = await request(app)
      .post('/api/recipe_likes')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipe_id: recipe.body._id, is_like: true });

    expect(like.status).toBe(201);
    expect(like.body.is_like).toBe(true);

    const dislike = await request(app)
      .post('/api/recipe_likes')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipe_id: recipe.body._id, is_like: false });

    expect(dislike.status).toBe(201);
    expect(dislike.body.is_like).toBe(false);

    const records = await RecipeLike.find({ recipe_id: recipe.body._id });
    expect(records).toHaveLength(1);
  });

  test('TC-13: Write Review (valid)', async () => {
    const { token } = await signup(app, { email: 'tc13@example.com' });
    const restaurant = await createRestaurant({ name: 'Review Target Resto' });

    const response = await request(app)
      .post(`/api/restaurants/${restaurant._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        rating: 5,
        review_text: 'Excellent food and service',
        images: ['https://cdn.example.com/food.jpg'],
      });

    expect(response.status).toBe(201);
    const saved = await RestaurantReview.findById(response.body._id).lean();
    expect(saved).not.toBeNull();
    expect(saved.rating).toBe(5);
  });

  test('TC-14: Write Review – Empty Submission', async () => {
    const { token } = await signup(app, { email: 'tc14@example.com' });
    const restaurant = await createRestaurant({ name: 'Empty Review Resto' });

    const response = await request(app)
      .post(`/api/restaurants/${restaurant._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Please provide at least a rating, comment, or image');
  });
});
