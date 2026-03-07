const mongoose = require('mongoose');

const menuCategorySchema = new mongoose.Schema({
  restaurant_id: {
    type: mongoose.Schema. Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  display_order: {
    type:  Number,
    default: 0
  },
  is_active: {
    type:  Boolean,
    default: true
  },
  created_at:  {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
menuCategorySchema.index({ restaurant_id: 1, display_order: 1 });

module.exports = mongoose.model('MenuCategory', menuCategorySchema);