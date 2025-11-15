const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  ingredients: {
    type: [String],
    required: true
  },
  instructions: {
    type: [String],
    required: true
  },
  cooking_time: Number,
  servings: {
    type: Number,
    default: 4
  },
  difficulty: String,
  cuisine: String,
  calories: Number,
  nutrition: {
    protein: String,
    carbs: String,
    fat: String,
    fiber: String
  },
  image_url: String,
  author_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  original_recipe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// REMOVE any compound unique indexes
// If you have this line, remove it:
// recipeSchema.index({ author_id: 1, title: 1, description: 1 }, { unique: true });

module.exports = mongoose.model('Recipe', recipeSchema);