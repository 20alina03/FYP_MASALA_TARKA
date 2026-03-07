const mongoose = require('mongoose');

const restaurantReviewSchema = new mongoose.Schema({
  restaurant_id: {
    type:  mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  user_id: {
    type: mongoose.Schema. Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review_text: String,
  images: [String],
  user_name: String,
  is_reported: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default:  Date.now
  }
});

restaurantReviewSchema.index({ restaurant_id: 1, created_at: -1 });

module.exports = mongoose.model('RestaurantReview', restaurantReviewSchema);