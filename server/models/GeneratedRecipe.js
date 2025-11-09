const mongoose = require('mongoose');

const generatedRecipeSchema = new mongoose.Schema({
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
  image_url: String,
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generated_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GeneratedRecipe', generatedRecipeSchema);
