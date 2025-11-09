const mongoose = require('mongoose');

const recipeBookSchema = new mongoose.Schema({
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
  added_at: {
    type: Date,
    default: Date.now
  }
});

// Create unique index to prevent duplicate entries
recipeBookSchema.index({ user_id: 1, recipe_id: 1 }, { unique: true });

module.exports = mongoose.model('RecipeBook', recipeBookSchema);
