const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurant_id: {
    type:  mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  category_id: {
    type: mongoose.Schema. Types.ObjectId,
    ref: 'MenuCategory'
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  price:  {
    type: Number,
    required: true
  },
  original_price: Number,
  discount_percentage: Number,
  image_url: String,
  is_available: {
    type: Boolean,
    default: true
  },
  is_popular: {
    type: Boolean,
    default: false
  },
  calories: Number,
  ingredients: [String],
  allergens: [String],
  dietary_tags: [String], // vegetarian, vegan, gluten-free, etc.
  preparation_time: Number, // in minutes
  spice_level: {
    type: String,
    enum: ['mild', 'medium', 'hot', 'very hot']
  },
  rating: {
    type: Number,
    default: 0
  },
  review_count: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default:  Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

menuItemSchema.index({ restaurant_id: 1, is_available: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);