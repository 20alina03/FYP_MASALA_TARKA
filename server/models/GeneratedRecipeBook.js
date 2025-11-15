const mongoose = require('mongoose');

const generatedRecipeBookSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generated_recipe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeneratedRecipe',
    required: true
  },
  added_at: {
    type: Date,
    default: Date.now
  }
});

// Create unique index to prevent duplicate entries
generatedRecipeBookSchema.index({ user_id: 1, generated_recipe_id: 1 }, { unique: true });

module.exports = mongoose.model('GeneratedRecipeBook', generatedRecipeBookSchema);