const mongoose = require('mongoose');

const recipeLikeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true
  },
  is_like: {
    type: Boolean,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create unique index
recipeLikeSchema.index({ user_id: 1, recipe_id: 1 }, { unique: true });

module.exports = mongoose.model('RecipeLike', recipeLikeSchema);
