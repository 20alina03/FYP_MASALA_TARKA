/**
 * Optimized Menu Service
 *
 * Builds one budget-constrained menu per restaurant.
 * Priority:
 * 1) Restaurant ranking: rating desc, positive reviews desc, negative reviews asc.
 * 2) Item ranking: item quality (rating + review sentiment/volume) desc, price asc tie-break.
 * 3) Course selection order: main -> side -> drink -> dessert -> starter.
 * 4) Budget usage: first ensure course coverage, then keep adding items until budget is nearly exhausted.
 */

const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const MenuItemReview = require('../models/MenuItemReview');
const RestaurantReview = require('../models/RestaurantReview');

const COURSE_CONFIG = [
  {
    course: 'main',
    label: 'Main Course',
    emoji: '🍛',
    keywords: ['main', 'rice', 'biryani', 'karahi', 'curry', 'nihari', 'pulao', 'burger', 'pizza', 'pasta', 'sandwich', 'roll', 'wrap', 'steak', 'grilled', 'bbq', 'tikka', 'kabab', 'chapli', 'seekh', 'naan', 'roti', 'paratha', 'bread', 'qorma', 'haleem', 'paya'],
  },
  {
    course: 'side',
    label: 'Side Dish',
    emoji: '🥙',
    keywords: ['side', 'raita', 'chutney', 'pickle', 'achar', 'sauce', 'daal', 'lentil', 'sabzi', 'vegetable', 'extra', 'add-on'],
  },
  {
    course: 'drink',
    label: 'Drink',
    emoji: '🥤',
    keywords: ['drink', 'juice', 'lassi', 'cola', 'water', 'tea', 'coffee', 'shake', 'smoothie', 'lemonade', 'soda', 'beverage', 'chai', 'doodh', 'milkshake', 'cold drink', 'sprite', 'pepsi', 'fanta'],
  },
  {
    course: 'dessert',
    label: 'Dessert / Sweet',
    emoji: '🍮',
    keywords: ['sweet', 'dessert', 'kheer', 'halwa', 'gulab', 'barfi', 'cake', 'ice cream', 'kulfi', 'pudding', 'brownie', 'pastry', 'mithai', 'jalebi', 'ladoo', 'rabri', 'firni', 'phirni'],
  },
  {
    course: 'starter',
    label: 'Starter',
    emoji: '🥗',
    keywords: ['starter', 'appetizer', 'soup', 'salad', 'samosa', 'spring roll', 'pakora', 'papadum', 'bruschetta', 'dip', 'nachos', 'fries', 'wings', 'snack', 'chat', 'chaat', 'papri'],
  },
];

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function wilsonLowerBound(positive, total) {
  if (!total || total <= 0) return 0;
  const z = 1.96;
  const pHat = positive / total;
  const numerator = pHat + (z * z) / (2 * total) - z * Math.sqrt((pHat * (1 - pHat) + (z * z) / (4 * total)) / total);
  const denominator = 1 + (z * z) / total;
  return clamp01(numerator / denominator);
}

function computeRestaurantScore(restaurant, reviewStats) {
  const persistedRating = Number(restaurant.rating || 0);
  const reviewAvgRating = Number(reviewStats.avgRating || 0);
  const rating = persistedRating > 0 ? persistedRating : reviewAvgRating;
  const ratingNorm = clamp01(rating / 5);

  const positive = Number(reviewStats.positive || 0);
  const negative = Number(reviewStats.negative || 0);
  const neutral = Number(reviewStats.neutral || 0);
  const total = Number(reviewStats.total || 0);

  const positiveSignal = positive / (positive + 40);
  const sentimentBalance = total > 0 ? (positive - negative) / total : 0;
  const sentimentNorm = clamp01((sentimentBalance + 1) / 2);
  const confidence = clamp01(total / 200);
  const wilson = wilsonLowerBound(positive, Math.max(positive + negative, 1));

  const score =
    0.35 * ratingNorm +
    0.30 * positiveSignal +
    0.20 * sentimentNorm +
    0.10 * wilson +
    0.05 * confidence;

  return clamp01(score);
}

function effectivePrice(item) {
  const base = Number(item.price || 0);
  if (item.discount_percentage && item.discount_percentage > 0) {
    return base * (1 - Number(item.discount_percentage) / 100);
  }
  return base;
}

function scoreMenuItem(item, itemStats) {
  const effective = effectivePrice(item);
  const rating = Number(item.rating || itemStats.avgRating || 0);
  const ratingNorm = clamp01(rating / 5);

  const positive = Number(itemStats.positive || 0);
  const negative = Number(itemStats.negative || 0);
  const total = Number(itemStats.total || 0);
  const positiveSignal = positive / (positive + 20);
  const sentimentBalance = total > 0 ? (positive - negative) / total : 0;
  const sentimentNorm = clamp01((sentimentBalance + 1) / 2);
  const reviewConfidence = clamp01(total / 80);
  const priceValue = clamp01(1 - effective / 2000);

  return (
    0.45 * ratingNorm +
    0.25 * positiveSignal +
    0.15 * sentimentNorm +
    0.10 * reviewConfidence +
    0.05 * priceValue
  );
}

function detectCourse(item) {
  const text = `${item.name} ${item.description || ''} ${item.category || ''}`.toLowerCase();
  for (const config of COURSE_CONFIG) {
    if (config.keywords.some(kw => text.includes(kw))) {
      return config.course;
    }
  }
  return 'main';
}

function buildRestaurantMealPlan(restaurant, menuItems, budget, itemReviewStatsMap, includeCourses = null) {
  const selectedCourses = (Array.isArray(includeCourses) && includeCourses.length > 0)
    ? COURSE_CONFIG.filter(config => includeCourses.includes(config.course))
    : COURSE_CONFIG;

  const selectedCourseSet = new Set(selectedCourses.map(config => config.course));
  if (selectedCourses.length === 0) return null;

  const itemsByCourse = COURSE_CONFIG.reduce((acc, config) => {
    acc[config.course] = [];
    return acc;
  }, {});

  for (const item of menuItems) {
    const effPrice = effectivePrice(item);
    if (effPrice <= 0 || effPrice > budget) continue;

    const courseDetected = detectCourse(item);
    const course = selectedCourseSet.has(courseDetected) ? courseDetected : null;
    if (!course) continue;

    const stats = itemReviewStatsMap[item._id.toString()] || {};
    itemsByCourse[course].push({
      ...item,
      course,
      effectivePrice: effPrice,
      derivedRating: Number(item.rating || stats.avgRating || 0),
      derivedReviewCount: Number(item.review_count || stats.total || 0),
      itemScore: scoreMenuItem(item, stats),
    });
  }

  for (const config of selectedCourses) {
    itemsByCourse[config.course].sort((a, b) => {
      if (Math.abs(b.itemScore - a.itemScore) > 0.0001) return b.itemScore - a.itemScore;
      const ratingDelta = Number(b.derivedRating || 0) - Number(a.derivedRating || 0);
      if (Math.abs(ratingDelta) > 0.001) return ratingDelta;
      const reviewDelta = Number(b.derivedReviewCount || 0) - Number(a.derivedReviewCount || 0);
      if (reviewDelta !== 0) return reviewDelta;
      return a.effectivePrice - b.effectivePrice;
    });
  }

  const selectedItems = [];
  const selectedItemIds = new Set();
  const nextIndexByCourse = {};
  let remaining = Number(budget);

  // Pass 1: try to cover each selected course once, by priority.
  for (const config of selectedCourses) {
    const candidates = itemsByCourse[config.course];
    nextIndexByCourse[config.course] = 0;

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      if (candidate.effectivePrice > remaining) continue;
      if (selectedItemIds.has(candidate._id.toString())) continue;

      selectedItems.push(candidate);
      selectedItemIds.add(candidate._id.toString());
      remaining -= candidate.effectivePrice;
      nextIndexByCourse[config.course] = i + 1;
      break;
    }
  }

  // If user included main, at least one main is mandatory.
  if (selectedCourseSet.has('main') && !selectedItems.some(i => i.course === 'main')) {
    return null;
  }

  if (selectedItems.length === 0) return null;

  // Pass 2: keep adding more dishes in course priority order.
  let addedInRound = true;
  while (addedInRound) {
    addedInRound = false;

    for (const config of selectedCourses) {
      const candidates = itemsByCourse[config.course];
      let idx = nextIndexByCourse[config.course] || 0;

      while (idx < candidates.length) {
        const candidate = candidates[idx];
        idx += 1;

        if (selectedItemIds.has(candidate._id.toString())) continue;
        if (candidate.effectivePrice > remaining) continue;

        selectedItems.push(candidate);
        selectedItemIds.add(candidate._id.toString());
        remaining -= candidate.effectivePrice;
        nextIndexByCourse[config.course] = idx;
        addedInRound = true;
        break;
      }

      nextIndexByCourse[config.course] = idx;
    }
  }

  // Pass 3: use leftover budget with cheapest remaining items.
  const remainingPool = selectedCourses
    .flatMap(config => itemsByCourse[config.course])
    .filter(item => !selectedItemIds.has(item._id.toString()))
    .sort((a, b) => {
      if (a.effectivePrice !== b.effectivePrice) return a.effectivePrice - b.effectivePrice;
      if (Math.abs(b.itemScore - a.itemScore) > 0.0001) return b.itemScore - a.itemScore;
      return Number(b.derivedRating || 0) - Number(a.derivedRating || 0);
    });

  for (const candidate of remainingPool) {
    if (candidate.effectivePrice > remaining) continue;
    selectedItems.push(candidate);
    selectedItemIds.add(candidate._id.toString());
    remaining -= candidate.effectivePrice;
  }

  const totalCost = selectedItems.reduce((sum, item) => sum + item.effectivePrice, 0);
  const mealPlan = selectedCourses
    .map(config => ({
      course: config.course,
      label: config.label,
      emoji: config.emoji,
      items: selectedItems
        .filter(item => item.course === config.course)
        .sort((a, b) => b.itemScore - a.itemScore)
        .map(item => ({
          _id: item._id,
          name: item.name,
          description: item.description,
          originalPrice: Number(item.price || 0),
          effectivePrice: Math.round(item.effectivePrice),
          discountPercentage: Number(item.discount_percentage || 0),
          rating: Number(item.derivedRating || 0),
          reviewCount: Number(item.derivedReviewCount || 0),
          image_url: item.image_url,
          restaurantId: restaurant._id,
          restaurantName: restaurant.name,
          restaurantScore: Number(restaurant._score.toFixed(3)),
        })),
    }))
    .filter(course => course.items.length > 0);

  return {
    restaurant: {
      id: restaurant._id,
      name: restaurant.name,
      rating: Number(restaurant._effectiveRating || 0),
      score: Number(restaurant._score.toFixed(3)),
      positiveReviews: Number(restaurant._reviewStats?.positive || 0),
      negativeReviews: Number(restaurant._reviewStats?.negative || 0),
      neutralReviews: Number(restaurant._reviewStats?.neutral || 0),
      totalReviews: Number(restaurant._reviewStats?.total || 0),
    },
    totalCost: Math.round(totalCost),
    savings: Math.round(Math.max(0, budget - totalCost)),
    coursesCovered: mealPlan.length,
    itemsCount: selectedItems.length,
    mealPlan,
  };
}

async function buildOptimizedMenu(budget, restaurantIds = null, includeCourses = null) {
  const restaurantQuery = restaurantIds ? { _id: { $in: restaurantIds } } : {};
  const restaurants = await Restaurant.find(restaurantQuery).lean();

  if (!restaurants.length) {
    return { success: false, message: 'No restaurants available' };
  }

  const restaurantReviewStats = await RestaurantReview.aggregate([
    {
      $group: {
        _id: '$restaurant_id',
        positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] } },
        negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] } },
        neutral: { $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] } },
        avgRating: { $avg: '$rating' },
        total: { $sum: 1 },
      },
    },
  ]);

  const restaurantStatsMap = {};
  for (const stats of restaurantReviewStats) {
    restaurantStatsMap[stats._id.toString()] = stats;
  }

  const scoredRestaurants = restaurants
    .map(restaurant => {
      const stats = restaurantStatsMap[restaurant._id.toString()] || {};
      const persistedRating = Number(restaurant.rating || 0);
      const reviewAvgRating = Number(stats.avgRating || 0);
      const effectiveRating = persistedRating > 0 ? persistedRating : reviewAvgRating;
      return {
        ...restaurant,
        _reviewStats: stats,
        _effectiveRating: effectiveRating,
        _score: computeRestaurantScore(restaurant, stats),
      };
    })
    .sort((a, b) => {
      const ratingDelta = Number(b._effectiveRating || 0) - Number(a._effectiveRating || 0);
      if (Math.abs(ratingDelta) > 0.001) return ratingDelta;

      const positiveDelta = Number(b._reviewStats?.positive || 0) - Number(a._reviewStats?.positive || 0);
      if (positiveDelta !== 0) return positiveDelta;

      const negativeDelta = Number(a._reviewStats?.negative || 0) - Number(b._reviewStats?.negative || 0);
      if (negativeDelta !== 0) return negativeDelta;

      return Number(b._score || 0) - Number(a._score || 0);
    });

  const qualityScoredRestaurants = scoredRestaurants.filter(restaurant =>
    Number(restaurant._effectiveRating || 0) >= 3 || Number(restaurant._reviewStats?.positive || 0) >= 20
  );

  const rankedRestaurants = qualityScoredRestaurants.length > 0 ? qualityScoredRestaurants : scoredRestaurants;

  const restaurantIdsList = rankedRestaurants.map(restaurant => restaurant._id);
  const allMenuItems = await MenuItem.find({
    restaurant_id: { $in: restaurantIdsList },
    is_available: true,
  }).lean();

  if (!allMenuItems.length) {
    return { success: false, message: 'No menu items available for optimization' };
  }

  const itemReviewStats = await MenuItemReview.aggregate([
    {
      $group: {
        _id: '$menu_item_id',
        positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] } },
        negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] } },
        neutral: { $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] } },
        avgRating: { $avg: '$rating' },
        total: { $sum: 1 },
      },
    },
  ]);

  const itemReviewStatsMap = {};
  for (const stats of itemReviewStats) {
    itemReviewStatsMap[stats._id.toString()] = stats;
  }

  const itemsByRestaurant = allMenuItems.reduce((acc, item) => {
    const key = item.restaurant_id.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const restaurantMenus = [];
  for (const restaurant of rankedRestaurants) {
    const menuItems = itemsByRestaurant[restaurant._id.toString()] || [];
    if (!menuItems.length) continue;

    const recommendation = buildRestaurantMealPlan(
      restaurant,
      menuItems,
      budget,
      itemReviewStatsMap,
      includeCourses
    );

    if (!recommendation) continue;
    restaurantMenus.push(recommendation);
  }

  restaurantMenus.sort((a, b) => {
    const ratingDelta = Number(b.restaurant.rating || 0) - Number(a.restaurant.rating || 0);
    if (Math.abs(ratingDelta) > 0.001) return ratingDelta;

    const positiveDelta = Number(b.restaurant.positiveReviews || 0) - Number(a.restaurant.positiveReviews || 0);
    if (positiveDelta !== 0) return positiveDelta;

    const negativeDelta = Number(a.restaurant.negativeReviews || 0) - Number(b.restaurant.negativeReviews || 0);
    if (negativeDelta !== 0) return negativeDelta;

    if (b.coursesCovered !== a.coursesCovered) return b.coursesCovered - a.coursesCovered;
    if (b.itemsCount !== a.itemsCount) return b.itemsCount - a.itemsCount;

    return b.totalCost - a.totalCost;
  });

  if (!restaurantMenus.length) {
    return {
      success: false,
      message: `No restaurant can build a menu under Rs. ${budget} for selected courses. Try increasing budget or changing course filters.`,
    };
  }

  const topRecommendation = restaurantMenus[0];

  return {
    success: true,
    budget,
    includeCourses: Array.isArray(includeCourses) && includeCourses.length ? includeCourses : COURSE_CONFIG.map(c => c.course),
    restaurantCount: restaurantMenus.length,
    recommendedMenus: restaurantMenus,
    totalCost: topRecommendation.totalCost,
    savings: topRecommendation.savings,
    mealPlan: topRecommendation.mealPlan,
    topRecommendation,
  };
}

module.exports = { buildOptimizedMenu, computeRestaurantScore };