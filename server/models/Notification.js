const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  restaurant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  type: {
    type: String,
    enum: [
      'bad_reviews_threshold',    // too many negative text reviews
      'bad_ratings_threshold',    // too many low star ratings
      'dish_bad_reviews',         // specific dish getting bad reviews
      'dish_bad_ratings',         // specific dish getting bad ratings
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  menu_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  },
  menu_item_name: String,
  is_read: { type: Boolean, default: false },
  // snapshot of counts at time of notification
  meta: {
    bad_review_count:  Number,
    bad_rating_count:  Number,
    threshold_hit:     String,
  },
  created_at: { type: Date, default: Date.now }
});

notificationSchema.index({ restaurant_id: 1, is_read: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);