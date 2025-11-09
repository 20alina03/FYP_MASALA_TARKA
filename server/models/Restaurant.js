const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  restaurant_id: Number,
  name: {
    type: String,
    required: true
  },
  address: String,
  rating: Number,
  review_count: Number,
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  city_id: Number,
  category_id: Number,
  distance: Number,
  image_url: String,
  slug: String,
  code: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
