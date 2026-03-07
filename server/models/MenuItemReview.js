const mongoose = require('mongoose');

const menuItemReviewSchema = new mongoose. Schema({
  menu_item_id: {
    type: mongoose.Schema.Types. ObjectId,
    ref: 'MenuItem',
    required: true
  },
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
    type:  Boolean,
    default: false
  },
  created_at:  {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

menuItemReviewSchema.index({ menu_item_id: 1, created_at:  -1 });

module.exports = mongoose.model('MenuItemReview', menuItemReviewSchema);