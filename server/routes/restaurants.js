const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const RestaurantReview = require('../models/RestaurantReview');
const MenuItemReview = require('../models/MenuItemReview');
const RestaurantAdmin = require('../models/RestaurantAdmin');
const RestaurantAdminRejected = require('../models/RestaurantAdminRejected');
const Report = require('../models/Report');
const CommunityPost = require('../models/CommunityPost');
const PostLike = require('../models/PostLike');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const { analyzeReview } = require('../services/sentimentService');
const Notification = require('../models/Notification');

const router = express.Router();

// ============= THRESHOLD NOTIFICATION CHECKER =============
// Thresholds
const THRESHOLDS = {
  BAD_REVIEWS:      50,   // negative sentiment text reviews
  BAD_RATINGS:      100,  // star ratings <= 2
  DISH_BAD_REVIEWS: 20,   // per dish negative reviews
  DISH_BAD_RATINGS: 40,   // per dish low ratings
};

async function checkAndNotify(restaurantId, menuItemId = null) {
  try {
    const RestaurantReviewModel = require('../models/RestaurantReview');
    const MenuItemReviewModel   = require('../models/MenuItemReview');
    const MenuItemModel         = require('../models/MenuItem');

    if (menuItemId) {
      // ── Dish-level checks ──────────────────────────────────────────
      const dishReviews = await MenuItemReviewModel.find({ menu_item_id: menuItemId }).lean();
      const dishBadReviews = dishReviews.filter(r => r.sentiment === 'negative' && r.review_text).length;
      const dishBadRatings = dishReviews.filter(r => r.rating > 0 && r.rating <= 2).length;

      const menuItem = await MenuItemModel.findById(menuItemId).lean();
      const itemName = menuItem?.name || 'Unknown dish';

      if (dishBadReviews > 0 && dishBadReviews % THRESHOLDS.DISH_BAD_REVIEWS === 0) {
        const exists = await Notification.findOne({
          restaurant_id: restaurantId,
          menu_item_id:  menuItemId,
          type: 'dish_bad_reviews',
          'meta.bad_review_count': dishBadReviews
        });
        if (!exists) {
          await Notification.create({
            restaurant_id:  restaurantId,
            menu_item_id:   menuItemId,
            menu_item_name: itemName,
            type:    'dish_bad_reviews',
            title:   `⚠️ ${itemName} is receiving negative feedback`,
            message: `Your dish "${itemName}" has reached ${dishBadReviews} negative reviews. Consider reviewing the quality, preparation, or description of this item.`,
            meta: { bad_review_count: dishBadReviews, threshold_hit: `${dishBadReviews} bad reviews` }
          });
        }
      }

      if (dishBadRatings > 0 && dishBadRatings % THRESHOLDS.DISH_BAD_RATINGS === 0) {
        const exists = await Notification.findOne({
          restaurant_id: restaurantId,
          menu_item_id:  menuItemId,
          type: 'dish_bad_ratings',
          'meta.bad_rating_count': dishBadRatings
        });
        if (!exists) {
          await Notification.create({
            restaurant_id:  restaurantId,
            menu_item_id:   menuItemId,
            menu_item_name: itemName,
            type:    'dish_bad_ratings',
            title:   `⭐ Low ratings for "${itemName}"`,
            message: `"${itemName}" has received ${dishBadRatings} low ratings (1–2 stars). Customers may be disappointed with this dish — consider improving it or updating the price.`,
            meta: { bad_rating_count: dishBadRatings, threshold_hit: `${dishBadRatings} low ratings` }
          });
        }
      }
    } else {
      // ── Restaurant-level checks ────────────────────────────────────
      const restReviews = await RestaurantReviewModel.find({ restaurant_id: restaurantId }).lean();

      const badReviews = restReviews.filter(r => r.sentiment === 'negative' && r.review_text).length;
      const badRatings = restReviews.filter(r => r.rating > 0 && r.rating <= 2).length;

      if (badReviews > 0 && badReviews % THRESHOLDS.BAD_REVIEWS === 0) {
        const exists = await Notification.findOne({
          restaurant_id: restaurantId,
          menu_item_id:  null,
          type: 'bad_reviews_threshold',
          'meta.bad_review_count': badReviews
        });
        if (!exists) {
          await Notification.create({
            restaurant_id: restaurantId,
            type:    'bad_reviews_threshold',
            title:   `🚨 ${badReviews} negative reviews reached`,
            message: `Your restaurant has accumulated ${badReviews} negative customer reviews. We recommend reviewing common complaints and improving the areas customers mention most — service, food quality, or wait times.`,
            meta: { bad_review_count: badReviews, threshold_hit: `${badReviews} negative reviews` }
          });
        }
      }

      if (badRatings > 0 && badRatings % THRESHOLDS.BAD_RATINGS === 0) {
        const exists = await Notification.findOne({
          restaurant_id: restaurantId,
          menu_item_id:  null,
          type: 'bad_ratings_threshold',
          'meta.bad_rating_count': badRatings
        });
        if (!exists) {
          await Notification.create({
            restaurant_id: restaurantId,
            type:    'bad_ratings_threshold',
            title:   `⭐ ${badRatings} low star ratings`,
            message: `Your restaurant has received ${badRatings} ratings of 1–2 stars. A pattern of low ratings can affect your visibility. Consider reaching out to unhappy customers and addressing their concerns.`,
            meta: { bad_rating_count: badRatings, threshold_hit: `${badRatings} low ratings` }
          });
        }
      }
    }
  } catch (err) {
    console.error('[Notify] Threshold check error:', err.message);
  }
}

// ============= RESTAURANT DISCOVERY =============

router.get('/discover', async (req, res) => {
  try {
    console.log('=== DISCOVER ENDPOINT CALLED ===');
    console.log('Query params:', req.query);
    
    let restaurants = await Restaurant.find({}).lean();
    
    console.log(`Total restaurants in DB: ${restaurants.length}`);
    
    if (restaurants.length === 0) {
      console.log('❌ No restaurants found in database!');
      return res.json([]);
    }
    
    console.log('✅ Sample restaurant:', {
      name: restaurants[0].name,
      lat: restaurants[0].latitude,
      lng: restaurants[0].longitude,
      rating: restaurants[0].rating,
      review_count: restaurants[0].review_number || restaurants[0].review_count
    });
    
    restaurants = restaurants.map(r => ({
      _id: r._id,
      name: r.name,
      address: r.address_line2 || r.address || 'Lahore',
      city: 'Lahore',
      latitude: r.latitude,
      longitude: r.longitude,
      contact_number: r.contact_number || r.phone || '+92-XXX-XXXXXXX',
      description: r.description || `${r.name} - Great food!`,
      cuisine_types: r.cuisines || ['Pakistani', 'Fast Food'],
      image_url: r.hero_listing_image || r.logo || '',
      rating: r.rating || 0,
      review_count: r.review_number || r.review_count || 0,
      minimum_order_amount: r.minimum_order_amount,
      delivery_fee: r.minimum_delivery_fee,
      url_key: r.url_key
    }));
    
    const { latitude, longitude, radius = 10, cuisine, city } = req.query;
    
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      const maxRadius = parseFloat(radius);
      
      console.log(`Filtering by distance: ${maxRadius}km from ${userLat}, ${userLon}`);
      
      restaurants = restaurants.map(restaurant => {
        const distance = calculateDistance(userLat, userLon, restaurant.latitude, restaurant.longitude);
        return { ...restaurant, distance: distance.toFixed(2) };
      }).filter(r => parseFloat(r.distance) <= maxRadius)
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      
      console.log(`After distance filter: ${restaurants.length} restaurants`);
    }
    
    if (cuisine) {
      restaurants = restaurants.filter(r => 
        r.cuisine_types?.includes(cuisine)
      );
      console.log(`After cuisine filter: ${restaurants.length} restaurants`);
    }
    
    if (city) {
      restaurants = restaurants.filter(r => 
        r.city?.toLowerCase().includes(city.toLowerCase())
      );
    }
    
    console.log(`✅ Returning ${restaurants.length} restaurants`);
    res.json(restaurants);
    
  } catch (error) {
    console.error('❌ Discover error:', error);
    res.status(500).json({ error: error.message });
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ============= COMMUNITY REVIEW ROUTES (MUST BE BEFORE :id ROUTES) =============

// Get all restaurant reviews for community
router.get('/all-reviews', async (req, res) => {
  try {
    const reviews = await RestaurantReview.find({ is_reported: false })
      .populate('restaurant_id', 'name city cuisines cuisine_types address address_line2 hero_listing_image')
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    const formattedReviews = reviews.map(r => ({
      ...r,
      user_name: r.user_name || 'Anonymous',
      restaurant_id: r.restaurant_id,
      // AI fields
      sentiment: r.sentiment || 'neutral',
      sentiment_score: r.sentiment_score ?? 0.5,
      sentiment_confidence: r.sentiment_confidence ?? 0,
      is_fake_suspected: r.is_fake_suspected || false,
      fake_score: r.fake_score || 0,
      fake_signals: r.fake_signals || [],
      original_language: r.original_language || 'unknown',
      translated_text: r.translated_text || '',
      ai_analyzed: r.ai_analyzed || false,
    }));

    res.json(formattedReviews);
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all menu item reviews for community
router.get('/all-menu-reviews', async (req, res) => {
  try {
    const reviews = await MenuItemReview.find({ is_reported: false })
      .populate('restaurant_id', 'name city cuisines cuisine_types address address_line2 hero_listing_image')
      .populate('menu_item_id', 'name')
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    const formattedReviews = reviews.map(r => ({
      ...r,
      user_name: r.user_name || 'Anonymous',
      menu_item_name: r.menu_item_id?.name || 'Unknown Dish',
      restaurant_id: r.restaurant_id,
      // AI fields
      sentiment: r.sentiment || 'neutral',
      sentiment_score: r.sentiment_score ?? 0.5,
      sentiment_confidence: r.sentiment_confidence ?? 0,
      is_fake_suspected: r.is_fake_suspected || false,
      fake_score: r.fake_score || 0,
      fake_signals: r.fake_signals || [],
      original_language: r.original_language || 'unknown',
      translated_text: r.translated_text || '',
      ai_analyzed: r.ai_analyzed || false,
    }));

    res.json(formattedReviews);
  } catch (error) {
    console.error('Get all menu reviews error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= RESTAURANT DETAIL ROUTES =============

router.get('/:id', async (req, res) => {
  try {
    console.log('🔍 Fetching restaurant details for ID:', req.params.id);
    
    const restaurant = await Restaurant.findById(req.params.id).lean();
    
    if (!restaurant) {
      console.log('❌ Restaurant not found');
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    console.log('✅ Restaurant found:', restaurant.name);
    
    const formattedRestaurant = {
      _id: restaurant._id,
      name: restaurant.name,
      address: restaurant.address_line2 || restaurant.address || 'Lahore',
      city: 'Lahore',
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      contact_number: restaurant.contact_number || restaurant.phone || '+92-XXX-XXXXXXX',
      description: restaurant.description || `${restaurant.name} - Great food and excellent service!`,
      cuisine_types: restaurant.cuisines || ['Pakistani', 'Fast Food'],
      image_url: restaurant.hero_listing_image || restaurant.logo || '',
      rating: restaurant.rating || 0,
      review_count: restaurant.review_number || restaurant.review_count || 0,
      minimum_order_amount: restaurant.minimum_order_amount,
      delivery_fee: restaurant.minimum_delivery_fee,
      admin_id: restaurant.admin_id || null,
    };
    
    let menuItems = [];
    try {
      menuItems = await MenuItem.find({ 
        restaurant_id: new mongoose.Types.ObjectId(req.params.id),
        is_available: true 
      }).lean();
      console.log(`📋 Found ${menuItems.length} menu items`);
    } catch (menuError) {
      console.log('⚠️ No menu items found (non-critical)');
      menuItems = [];
    }
    
    let reviews = [];
    try {
      reviews = await RestaurantReview.find({ 
        restaurant_id: req.params.id, 
        is_reported: false 
      }).sort({ created_at: -1 }).limit(10).lean();
      console.log(`⭐ Found ${reviews.length} reviews`);
    } catch (reviewError) {
      console.log('⚠️ No reviews found (non-critical)');
      reviews = [];
    }
    
    const response = {
      ...formattedRestaurant,
      menu_items: menuItems,
      recent_reviews: reviews,
    };
    
    console.log('✅ Sending restaurant details');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Get restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/menu', async (req, res) => {
  try {
    const { budget, category } = req.query;
    let query = { 
      restaurant_id: new mongoose.Types.ObjectId(req.params.id),
      is_available: true 
    };
    
    if (budget && parseFloat(budget) < 100000) {
      query.price = { $lte: parseFloat(budget) };
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const menuItems = await MenuItem.find(query).sort({ rating: -1, price: 1 }).lean();
    res.json(menuItems);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/menu-reviews', async (req, res) => {
  try {
    const menuReviews = await MenuItemReview.find({ 
      restaurant_id: new mongoose.Types.ObjectId(req.params.id),
      is_reported: false 
    })
      .populate('menu_item_id', 'name')
      .sort({ created_at: -1 })
      .lean();
    
    const reviewsWithItemName = menuReviews.map(review => ({
      ...review,
      menu_item_name: review.menu_item_id?.name || 'Unknown Dish'
    }));
    
    res.json(reviewsWithItemName);
  } catch (error) {
    console.error('Get menu reviews error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await RestaurantReview.find({ 
      restaurant_id: req.params.id, 
      is_reported: false 
    }).sort({ created_at: -1 }).lean();
    
    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= REVIEW CREATION ROUTES =============

router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, review_text, images } = req.body;
    
    if (!rating && !review_text && (!images || images.length === 0)) {
      return res.status(400).json({ error: 'Please provide at least a rating, comment, or image' });
    }

    // Fetch restaurant's overall rating and review count for fake detection
    const restaurant = await Restaurant.findById(req.params.id).select('rating review_count review_number').lean();
    const restaurantRating      = restaurant?.rating || 0;
    const restaurantReviewCount = restaurant?.review_count || restaurant?.review_number || 0;

    // Run AI analysis (translation + sentiment + fake detection)
    const aiData = await analyzeReview(review_text, restaurantRating, restaurantReviewCount).catch(err => {
      console.error('AI analysis failed (non-fatal):', err.message);
      return {};
    });
    
    const review = new RestaurantReview({
      restaurant_id: req.params.id,
      user_id: req.user.id,
      ...(rating && rating > 0 ? { rating } : { rating: 0 }),
      review_text: review_text || '',
      images: images || [],
      user_name: req.user.full_name || req.user.email,
      ...aiData
    });
    
    await review.save();
    await updateRestaurantRating(req.params.id);
    // Fire-and-forget threshold check
    checkAndNotify(req.params.id).catch(() => {});
    
    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/menu/:menuItemId/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, review_text, images } = req.body;
    
    if (!rating && !review_text && (!images || images.length === 0)) {
      return res.status(400).json({ error: 'Please provide at least a rating, comment, or image' });
    }
    
    const menuItem = await MenuItem.findById(req.params.menuItemId).lean();
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Fetch restaurant's overall rating and review count for fake detection
    const restaurant = await Restaurant.findById(menuItem.restaurant_id).select('rating review_count review_number').lean();
    const restaurantRating      = restaurant?.rating || 0;
    const restaurantReviewCount = restaurant?.review_count || restaurant?.review_number || 0;

    // Run AI analysis (translation + sentiment + fake detection)
    const aiData = await analyzeReview(review_text, restaurantRating, restaurantReviewCount).catch(err => {
      console.error('AI analysis failed (non-fatal):', err.message);
      return {};
    });
    
    const review = new MenuItemReview({
      menu_item_id: req.params.menuItemId,
      restaurant_id: menuItem.restaurant_id,
      user_id: req.user.id,
      ...(rating && rating > 0 ? { rating } : { rating: 0 }),
      review_text: review_text || '',
      images: images || [],
      user_name: req.user.full_name || req.user.email,
      ...aiData
    });
    
    await review.save();
    await updateMenuItemRating(req.params.menuItemId);
    // Fire-and-forget threshold check for the dish
    checkAndNotify(menuItem.restaurant_id, req.params.menuItemId).catch(() => {});
    
    res.status(201).json(review);
  } catch (error) {
    console.error('Create menu review error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= COMMUNITY POSTS =============

router.get('/community/posts', async (req, res) => {
  try {
    const { restaurant_id, cuisine, post_type } = req.query;
    let query = {};
    
    if (restaurant_id) {
      query.restaurant_id = restaurant_id;
    }
    if (post_type && post_type !== 'all') {
      query.post_type = post_type;
    }
    
    let posts = await CommunityPost.find(query)
      .populate('restaurant_id', 'name city rating cuisine_types image_url')
      .sort({ created_at: -1 })
      .limit(50)
      .lean();
    
    if (cuisine && cuisine !== 'all') {
      posts = posts.filter(post => 
        post.restaurant_id?.cuisine_types?.includes(cuisine)
      );
    }
    
    if (req.user) {
      const userLikes = await PostLike.find({ user_id: req.user.id }).lean();
      const likedPostIds = new Set(userLikes.map(like => like.post_id.toString()));
      
      posts = posts.map(post => ({
        ...post,
        user_liked: likedPostIds.has(post._id.toString())
      }));
    }
    
    res.json(posts);
  } catch (error) {
    console.error('Get community posts error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/community/posts', authenticateToken, async (req, res) => {
  try {
    const { restaurant_id, post_type, content, media_url } = req.body;
    
    const adminData = await RestaurantAdmin.findOne({ 
      user_id: req.user.id, 
      status: 'approved',
      restaurant_id: restaurant_id
    }).lean();
    
    if (!adminData) {
      return res.status(403).json({ error: 'Not authorized to post for this restaurant' });
    }
    
    const post = new CommunityPost({
      restaurant_id,
      post_type,
      content,
      media_url,
      likes_count: 0,
      comments_count: 0
    });
    
    await post.save();
    await post.populate('restaurant_id', 'name city rating cuisine_types');
    
    console.log('Community post created:', post._id);
    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/community/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    
    const existingLike = await PostLike.findOne({
      user_id: req.user.id,
      post_id: postId
    });
    
    if (existingLike) {
      await existingLike.deleteOne();
      await CommunityPost.findByIdAndUpdate(postId, {
        $inc: { likes_count: -1 }
      });
      res.json({ message: 'Post unliked', liked: false });
    } else {
      const like = new PostLike({
        user_id: req.user.id,
        post_id: postId
      });
      await like.save();
      await CommunityPost.findByIdAndUpdate(postId, {
        $inc: { likes_count: 1 }
      });
      res.json({ message: 'Post liked', liked: true });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/community/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId).lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const isSuperAdmin = req.user.email === 'alinarafiq0676@gmail.com';
    const adminData = await RestaurantAdmin.findOne({
      user_id: req.user.id,
      status: 'approved',
      restaurant_id: post.restaurant_id
    }).lean();
    
    if (!isSuperAdmin && !adminData) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await CommunityPost.findByIdAndDelete(req.params.postId);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= ADMIN ROUTES =============

router.post('/admin/request', authenticateToken, async (req, res) => {
  try {
    const { restaurant_name, government_registration_number, cnic, contact_number, address, city, latitude, longitude, description, cuisine_types } = req.body;
    
    const existingRequest = await RestaurantAdmin.findOne({ user_id: req.user.id });
    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request' });
    }

    const existingRegNum = await RestaurantAdmin.findOne({ government_registration_number });
    if (existingRegNum) {
      return res.status(400).json({ error: 'government_registration_number already exists' });
    }

    const existingCnic = await RestaurantAdmin.findOne({ cnic });
    if (existingCnic) {
      return res.status(400).json({ error: 'cnic already exists' });
    }
    
    const adminRequest = new RestaurantAdmin({
      user_id: req.user.id,
      restaurant_name,
      government_registration_number,
      cnic,
      contact_number,
      address,
      city,
      latitude,
      longitude,
      description,
      cuisine_types
    });
    
    await adminRequest.save();
    res.status(201).json({ message: 'Request submitted successfully', request: adminRequest });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({ error: `${field} already exists` });
    }
    console.error('Admin request error:', error);
    res.status(500).json({ error: error.message });
  }
});
router.patch('/admin/update', authenticateToken, async (req, res) => {
  try {
    const { name, contact_number, address, city, description, cuisine_types } = req.body;

    // Find the approved admin record for this user
    const adminRecord = await RestaurantAdmin.findOne({
      user_id: req.user.id,
      status: 'approved'
    });

    if (!adminRecord) {
      return res.status(403).json({ error: 'No approved restaurant found for this user' });
    }

    // Build update object with only the fields that were provided
    const updateFields = {};
    if (name !== undefined)            updateFields.name            = name;
    if (contact_number !== undefined)  updateFields.contact_number  = contact_number;
    if (address !== undefined)         updateFields.address         = address;
    if (city !== undefined)            updateFields.city            = city;
    if (description !== undefined)     updateFields.description     = description;
    if (cuisine_types !== undefined)   updateFields.cuisine_types   = cuisine_types;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      adminRecord.restaurant_id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedRestaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ message: 'Restaurant updated successfully', restaurant: updatedRestaurant });
  } catch (error) {
    console.error('Admin update error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/admin/status', authenticateToken, async (req, res) => {
  try {
    let adminData = await RestaurantAdmin.findOne({ user_id: req.user.id })
      .populate('restaurant_id')
      .lean();
    
    // If the request was rejected, we move it out of RestaurantAdmin into a separate collection.
    if (!adminData) {
      adminData = await RestaurantAdminRejected.findOne({ user_id: req.user.id })
        .populate('restaurant_id')
        .lean();
    }

    if (!adminData) {
      return res.json({ status: 'none' });
    }
    
    res.json(adminData);
  } catch (error) {
    console.error('Get admin status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/admin/my-restaurant', authenticateToken, async (req, res) => {
  try {
    const adminData = await RestaurantAdmin.findOne({ 
      user_id: req.user.id, 
      status: 'approved' 
    }).lean();
    
    if (!adminData || !adminData.restaurant_id) {
      return res.status(404).json({ error: 'No approved restaurant found' });
    }
    
    const restaurant = await Restaurant.findById(adminData.restaurant_id).lean();
    const menuItems = await MenuItem.find({ restaurant_id: adminData.restaurant_id }).lean();
    const reviews = await RestaurantReview.find({ restaurant_id: adminData.restaurant_id }).lean();
    const menuReviews = await MenuItemReview.find({ restaurant_id: adminData.restaurant_id }).lean();
    const restaurantData = {
  ...restaurant,
  government_registration_number: adminData.government_registration_number,
  cnic: adminData.cnic,
};
res.json({ restaurant: restaurantData, menu_items: menuItems, reviews, menu_reviews: menuReviews });
  } catch (error) {
    console.error('Get my restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/menu', authenticateToken, async (req, res) => {
  try {
    const adminData = await RestaurantAdmin.findOne({ 
      user_id: req.user.id, 
      status: 'approved' 
    }).lean();
    
    if (!adminData || !adminData.restaurant_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const menuItem = new MenuItem({ ...req.body, restaurant_id: adminData.restaurant_id });
    await menuItem.save();
    
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/menu/:id', authenticateToken, async (req, res) => {
  try {
    const adminData = await RestaurantAdmin.findOne({ 
      user_id: req.user.id, 
      status: 'approved' 
    }).lean();
    
    if (!adminData) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const menuItem = await MenuItem.findOne({ 
      _id: req.params.id, 
      restaurant_id: adminData.restaurant_id 
    });
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    Object.assign(menuItem, req.body);
    menuItem.updated_at = new Date();
    await menuItem.save();
    
    res.json(menuItem);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admin/menu/:id', authenticateToken, async (req, res) => {
  try {
    const adminData = await RestaurantAdmin.findOne({ 
      user_id: req.user.id, 
      status: 'approved' 
    }).lean();
    
    if (!adminData) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const menuItem = await MenuItem.findOne({ 
      _id: req.params.id, 
      restaurant_id: adminData.restaurant_id 
    });
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    await menuItem.deleteOne();
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/menu/:id/discount', authenticateToken, async (req, res) => {
  try {
    const { discount_percentage } = req.body;
    
    const adminData = await RestaurantAdmin.findOne({ 
      user_id: req.user.id, 
      status: 'approved' 
    }).lean();
    
    if (!adminData) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const menuItem = await MenuItem.findOne({ 
      _id: req.params.id, 
      restaurant_id: adminData.restaurant_id 
    });
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    menuItem.original_price = menuItem.original_price || menuItem.price;
    menuItem.discount_percentage = discount_percentage;
    menuItem.price = menuItem.original_price * (1 - discount_percentage / 100);
    menuItem.updated_at = new Date();
    await menuItem.save();
    
    res.json(menuItem);
  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/bulk-discount', authenticateToken, async (req, res) => {
  try {
    const { restaurant_id, category, discount_percentage } = req.body;
    
    const adminData = await RestaurantAdmin.findOne({
      user_id: req.user.id,
      status: 'approved',
      restaurant_id: restaurant_id
    }).lean();
    
    if (!adminData) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    if (discount_percentage < 0 || discount_percentage > 90) {
      return res.status(400).json({ error: 'Discount must be between 0% and 90%' });
    }
    
    let query = { restaurant_id: restaurant_id };
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const menuItems = await MenuItem.find(query);
    
    if (menuItems.length === 0) {
      return res.status(404).json({ error: 'No menu items found' });
    }
    
    const updates = menuItems.map(async (item) => {
      if (!item.original_price || item.discount_percentage === 0) {
        item.original_price = item.price;
      }
      
      if (discount_percentage === 0) {
        item.price = item.original_price;
        item.discount_percentage = 0;
      } else {
        item.discount_percentage = discount_percentage;
        item.price = item.original_price * (1 - discount_percentage / 100);
      }
      
      item.updated_at = new Date();
      return item.save();
    });
    
    await Promise.all(updates);
    
    console.log(`Bulk discount applied: ${discount_percentage}% to ${menuItems.length} items`);
    res.json({ 
      message: 'Discount applied successfully',
      items_updated: menuItems.length
    });
  } catch (error) {
    console.error('Apply bulk discount error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/report', authenticateToken, async (req, res) => {
  try {
    const { review_id, report_type, reason, restaurant_id } = req.body;
    
    const adminData = await RestaurantAdmin.findOne({ 
      user_id: req.user.id, 
      status: 'approved' 
    }).lean();
    
    if (!adminData) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const report = new Report({ 
      reporter_id: req.user.id, 
      report_type, 
      review_id, 
      restaurant_id, 
      reason 
    });
    
    await report.save();
    
    if (report_type === 'restaurant_review') {
      await RestaurantReview.findByIdAndUpdate(review_id, { is_reported: true });
    } else {
      await MenuItemReview.findByIdAndUpdate(review_id, { is_reported: true });
    }
    
    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({ error: error.message });
  }
});
router.post('/admin/change-password', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = password; // triggers pre-save hook to hash
    user.updated_at = new Date();
    await user.save();

    res.status(201).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= SUPER ADMIN ROUTES =============

router.get('/superadmin/requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // pending + approved come from RestaurantAdmin, rejected comes from RestaurantAdminRejected
    const [activeRequests, rejectedRequests] = await Promise.all([
      RestaurantAdmin.find({ status: { $in: ['pending', 'approved'] } })
        .populate('user_id', 'email full_name')
        .sort({ created_at: -1 })
        .lean(),
      RestaurantAdminRejected.find()
        .populate('user_id', 'email full_name')
        .sort({ created_at: -1 })
        .lean(),
    ]);

    const combined = [...activeRequests, ...rejectedRequests]
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

    res.json(combined);
  } catch (error) {
    console.error('Get admin requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/superadmin/approve/:requestId', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const adminRequest = await RestaurantAdmin.findById(req.params.requestId);
    if (!adminRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // If a restaurant already exists in DB without an admin, assign it instead of creating a duplicate.
    // Match order:
    // 1) name + city + address
    // 2) name + address
    // 3) name only
    const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const makeLooseRegex = (s) => {
      const tokens = String(s || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(escapeRegex);
      if (tokens.length === 0) return null;
      return new RegExp(tokens.join('\\s+'), 'i');
    };

    // Forgiving matching: ignores case and tolerates whitespace differences.
    const nameRegex = makeLooseRegex(adminRequest.restaurant_name);
    const cityRegex = adminRequest.city ? makeLooseRegex(adminRequest.city) : null;
    const addressRegex = adminRequest.address ? makeLooseRegex(adminRequest.address) : null;

    const baseNoAdminQuery = {
      ...(nameRegex ? { name: { $regex: nameRegex } } : {}),
      $or: [{ admin_id: null }, { admin_id: { $exists: false } }],
    };
    const addressOr = addressRegex
      ? { $or: [{ address: addressRegex }, { address_line2: addressRegex }] }
      : null;

    // 1) name + city + address
    let restaurant =
      (cityRegex && addressOr
        ? await Restaurant.findOne({
            ...baseNoAdminQuery,
            city: cityRegex,
            ...addressOr,
          })
        : null) ||
      // 2) name + address
      (addressOr
        ? await Restaurant.findOne({
            ...baseNoAdminQuery,
            ...addressOr,
          })
        : null) ||
      // 3) name only
      (await Restaurant.findOne(baseNoAdminQuery));

    // Final safety: search by name only (ignoring any city/address differences),
    // then pick the earliest-created restaurant that has no admin set.
    if (!restaurant && nameRegex) {
      const nameMatches = await Restaurant.find({ name: { $regex: nameRegex } })
        .sort({ created_at: 1 })
        .lean();
      const noAdminMatch = nameMatches.find((r) => r.admin_id == null);
      if (noAdminMatch) restaurant = await Restaurant.findById(noAdminMatch._id);
    }

    if (restaurant) {
      restaurant.admin_id = adminRequest.user_id;
      // Fill in missing fields from the request (do not overwrite existing populated data)
      if (!restaurant.address && adminRequest.address) restaurant.address = adminRequest.address;
      if (!restaurant.city && adminRequest.city) restaurant.city = adminRequest.city;
      if (!restaurant.latitude && adminRequest.latitude) restaurant.latitude = adminRequest.latitude;
      if (!restaurant.longitude && adminRequest.longitude) restaurant.longitude = adminRequest.longitude;
      if (!restaurant.contact_number && adminRequest.contact_number) {
        restaurant.contact_number = adminRequest.contact_number;
      }
      if (!restaurant.description && adminRequest.description) restaurant.description = adminRequest.description;
      if (
        (!Array.isArray(restaurant.cuisine_types) || restaurant.cuisine_types.length === 0) &&
        Array.isArray(adminRequest.cuisine_types) &&
        adminRequest.cuisine_types.length > 0
      ) {
        restaurant.cuisine_types = adminRequest.cuisine_types;
      }
      restaurant.updated_at = new Date();
      await restaurant.save();
    } else {
      restaurant = new Restaurant({
        name: adminRequest.restaurant_name,
        address: adminRequest.address,
        city: adminRequest.city,
        latitude: adminRequest.latitude,
        longitude: adminRequest.longitude,
        admin_id: adminRequest.user_id,
        contact_number: adminRequest.contact_number,
        description: adminRequest.description,
        cuisine_types: adminRequest.cuisine_types,
      });

      await restaurant.save();
    }
    
    adminRequest.status = 'approved';
    adminRequest.restaurant_id = restaurant._id;
    adminRequest.approved_at = new Date();
    adminRequest.approved_by = req.user.id;
    await adminRequest.save();
    
    const UserRole = require('../models/UserRole');
    let userRole = await UserRole.findOne({ user_id: adminRequest.user_id });
    if (!userRole) {
      userRole = new UserRole({ user_id: adminRequest.user_id, role: 'admin' });
    } else {
      userRole.role = 'admin';
    }
    await userRole.save();
    
    res.json({ message: 'Admin request approved', restaurant });
  } catch (error) {
    console.error('Approve admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/superadmin/reject/:requestId', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const adminRequest = await RestaurantAdmin.findById(req.params.requestId);
    if (!adminRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Copy to rejected collection, then delete from the active one.
    const rejectedDoc = new RestaurantAdminRejected({
      user_id: adminRequest.user_id,
      restaurant_name: adminRequest.restaurant_name,
      government_registration_number: adminRequest.government_registration_number,
      cnic: adminRequest.cnic,
      contact_number: adminRequest.contact_number,
      address: adminRequest.address,
      city: adminRequest.city,
      latitude: adminRequest.latitude,
      longitude: adminRequest.longitude,
      description: adminRequest.description,
      cuisine_types: adminRequest.cuisine_types,
      restaurant_id: adminRequest.restaurant_id,
      status: 'rejected',
      created_at: adminRequest.created_at || new Date(),
      rejected_at: new Date(),
      approved_at: adminRequest.approved_at,
      approved_by: adminRequest.approved_by,
    });

    await rejectedDoc.save();
    await RestaurantAdmin.findByIdAndDelete(req.params.requestId);

    res.json({ message: 'Admin request rejected' });
  } catch (error) {
    console.error('Reject admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/superadmin/reports', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const reports = await Report.find()
      .populate('reporter_id', 'email full_name')
      .populate('restaurant_id', 'name')
      .sort({ created_at: -1 })
      .lean();
    
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/superadmin/reports/:reportId/resolve', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { action, resolution_note, block_user } = req.body;
    const report = await Report.findById(req.params.reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (action === 'delete_review') {
      if (report.report_type === 'restaurant_review') {
        await RestaurantReview.findByIdAndDelete(report.review_id);
      } else {
        await MenuItemReview.findByIdAndDelete(report.review_id);
      }
      
      if (block_user) {
        const User = require('../models/User');
        const review = report.report_type === 'restaurant_review' 
          ? await RestaurantReview.findById(report.review_id).lean()
          : await MenuItemReview.findById(report.review_id).lean();
        
        if (review) {
          await User.findByIdAndUpdate(review.user_id, { is_blocked: true });
        }
      }
    }
    
    report.status = 'resolved';
    report.resolved_by = req.user.id;
    report.resolved_at = new Date();
    report.resolution_note = resolution_note;
    await report.save();
    
    res.json({ message: 'Report resolved successfully' });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/superadmin/all-restaurants', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [restaurants, total] = await Promise.all([
      Restaurant.find()
        .populate('admin_id', 'email full_name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Restaurant.countDocuments(),
    ]);

    res.json({
      restaurants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Get all restaurants error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/superadmin/restaurants', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const {
      name,
      address,
      city,
      contact_number,
      description,
      cuisine_types,
      latitude,
      longitude,
      image_url,
    } = req.body;

    if (!name || !address || !city) {
      return res
        .status(400)
        .json({ error: 'Name, address, and city are required' });
    }

    const restaurant = new Restaurant({
      name,
      address,
      city,
      contact_number,
      description,
      cuisine_types: Array.isArray(cuisine_types) ? cuisine_types : [],
      latitude,
      longitude,
      image_url,
    });

    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/superadmin/restaurants/:restaurantId', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const updatableFields = [
      'name',
      'address',
      'city',
      'contact_number',
      'description',
      'cuisine_types',
      'latitude',
      'longitude',
    ];

    updatableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        restaurant[field] = req.body[field];
      }
    });

    restaurant.updated_at = new Date();
    await restaurant.save();

    res.json(restaurant);
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/superadmin/restaurants/:restaurantId/menu', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const menuItems = await MenuItem.find({ restaurant_id: req.params.restaurantId }).lean();
    res.json(menuItems);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/superadmin/menu/:itemId', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const menuItem = await MenuItem.findById(req.params.itemId);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Only allow editing menu items for restaurants that do NOT have an admin
    if (menuItem.restaurant_id) {
      const restaurant = await Restaurant.findById(menuItem.restaurant_id).lean();
      if (restaurant && restaurant.admin_id) {
        return res.status(403).json({ error: 'Cannot edit menu items for restaurants with an admin' });
      }
    }
    
    Object.assign(menuItem, req.body);
    menuItem.updated_at = new Date();
    await menuItem.save();
    
    res.json(menuItem);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/superadmin/menu/:itemId', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const menuItem = await MenuItem.findById(req.params.itemId);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    await menuItem.deleteOne();
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/superadmin/restaurants/:restaurantId', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    await MenuItem.deleteMany({ restaurant_id: req.params.restaurantId });
    await MenuCategory.deleteMany({ restaurant_id: req.params.restaurantId });
    await RestaurantReview.deleteMany({ restaurant_id: req.params.restaurantId });
    await MenuItemReview.deleteMany({ restaurant_id: req.params.restaurantId });
    await CommunityPost.deleteMany({ restaurant_id: req.params.restaurantId });
    
    await RestaurantAdmin.updateMany(
      { restaurant_id: req.params.restaurantId },
      { status: 'rejected', restaurant_id: null }
    );
    
    await restaurant.deleteOne();
    
    res.json({ message: 'Restaurant and all related data deleted' });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= HELPER FUNCTIONS =============

async function updateRestaurantRating(restaurantId) {
  try {
    const reviews = await RestaurantReview.find({ 
      restaurant_id: restaurantId, 
      is_reported: false 
    }).lean();
    
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await Restaurant.findByIdAndUpdate(restaurantId, { 
        rating: avgRating, 
        review_count: reviews.length 
      });
    }
  } catch (error) {
    console.error('Update restaurant rating error:', error);
  }
}

async function updateMenuItemRating(menuItemId) {
  try {
    const reviews = await MenuItemReview.find({ 
      menu_item_id: menuItemId, 
      is_reported: false 
    }).lean();
    
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await MenuItem.findByIdAndUpdate(menuItemId, { 
        rating: avgRating, 
        review_count: reviews.length 
      });
    }
  } catch (error) {
    console.error('Update menu item rating error:', error);
  }
}


// ============= NOTIFICATIONS (Admin) =============

// Get notifications for the logged-in restaurant admin
router.get('/admin/notifications', authenticateToken, async (req, res) => {
  try {
    const adminData = await RestaurantAdmin.findOne({ user_id: req.user.id, status: 'approved' }).lean();
    if (!adminData) return res.status(403).json({ error: 'Not an approved admin' });

    const notifications = await Notification.find({ restaurant_id: adminData.restaurant_id })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification(s) as read
router.patch('/admin/notifications/read', authenticateToken, async (req, res) => {
  try {
    const adminData = await RestaurantAdmin.findOne({ user_id: req.user.id, status: 'approved' }).lean();
    if (!adminData) return res.status(403).json({ error: 'Not an approved admin' });

    const { notification_ids } = req.body; // array of ids, or empty = mark all
    const query = { restaurant_id: adminData.restaurant_id };
    if (notification_ids?.length) query._id = { $in: notification_ids };

    await Notification.updateMany(query, { is_read: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= SUPER ADMIN — Delete Community Reviews =============

// Delete a restaurant review (super admin only)
router.delete('/superadmin/community-reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const review = await RestaurantReview.findByIdAndDelete(req.params.reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    // Update restaurant rating after deletion
    await updateRestaurantRating(review.restaurant_id);

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete community review error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a menu item review (super admin only)
router.delete('/superadmin/community-menu-reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    if (req.user.email !== 'alinarafiq0676@gmail.com') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const review = await MenuItemReview.findByIdAndDelete(req.params.reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    // Update menu item rating after deletion
    await updateMenuItemRating(review.menu_item_id);

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete community menu review error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;