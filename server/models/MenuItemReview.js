const mongoose = require('mongoose');

const menuItemReviewSchema = new mongoose.Schema({
  menu_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  restaurant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
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

  // ── AI Analysis Fields ──────────────────────────────
  original_language: {
    type: String,
    enum: ['english', 'urdu', 'roman_urdu', 'unknown'],
    default: 'unknown'
  },
  translated_text: {
    type: String,
    default: ''
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral'
  },
  sentiment_score: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  sentiment_confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  is_fake_suspected: {
    type: Boolean,
    default: false
  },
  fake_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  fake_signals: {
    type: [String],
    default: []
  },
  ai_analyzed: {
    type: Boolean,
    default: false
  },
  // ────────────────────────────────────────────────────

  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

menuItemReviewSchema.index({ menu_item_id: 1, created_at: -1 });
menuItemReviewSchema.index({ sentiment: 1 });
menuItemReviewSchema.index({ is_fake_suspected: 1 });

module.exports = mongoose.model('MenuItemReview', menuItemReviewSchema);