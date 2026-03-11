const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  // Your existing fields
  name: String,
  address: String,
  address_line2: String,  // Add this
  city: String,
  latitude: Number,
  longitude: Number,
  contact_number: String,
  phone: String,  // Add this
  description: String,
  cuisine_types: [String],
  cuisines: [String],  // Add this
  image_url: String,
  hero_listing_image: String,  // Add this
  logo: String,  // Add this
  rating: Number,
  review_count: Number,
  review_number: Number,  // Add this
  minimum_order_amount: Number,
  minimum_delivery_fee: Number,
  url_key: String,
  code: String,
  external_id: String,
  admin_id: {type: mongoose.Schema.Types.ObjectId,
    ref: 'User',},
  created_at: { type: Date, default: Date. now },
  updated_at:  { type: Date, default: Date.now }
}, { 
  strict: false  // This allows extra fields
});

module.exports = mongoose.model('Restaurant', restaurantSchema);