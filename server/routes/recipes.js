const express = require('express');
const Recipe = require('../models/Recipe');
const GeneratedRecipe = require('../models/GeneratedRecipe');
const RecipeBook = require('../models/RecipeBook');
const RecipeLike = require('../models/RecipeLike');
const RecipeComment = require('../models/RecipeComment');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all community recipes
router.get('/recipes', async (req, res) => {
  try {
    const recipes = await Recipe.find()
      .populate('author_id', 'email full_name')
      .sort({ created_at: -1 });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create recipe (share to community)
router.post('/recipes', authenticateToken, async (req, res) => {
  try {
    const recipe = new Recipe({
      ...req.body,
      author_id: req.user.id
    });
    await recipe.save();
    res.status(201).json(recipe);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Recipe already shared', code: '23505' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update recipe
router.put('/recipes/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await Recipe.findOne({ _id: req.params.id, author_id: req.user.id });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    Object.assign(recipe, req.body);
    recipe.updated_at = new Date();
    await recipe.save();
    
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete recipe
router.delete('/recipes/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await Recipe.findOneAndDelete({ _id: req.params.id, author_id: req.user.id });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get generated recipes for user
router.get('/generated_recipes', authenticateToken, async (req, res) => {
  try {
    const recipes = await GeneratedRecipe.find({ user_id: req.user.id })
      .sort({ generated_at: -1 });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create generated recipe
router.post('/generated_recipes', authenticateToken, async (req, res) => {
  try {
    const recipe = new GeneratedRecipe({
      ...req.body,
      user_id: req.user.id
    });
    await recipe.save();
    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete generated recipe
router.delete('/generated_recipes/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await GeneratedRecipe.findOneAndDelete({ 
      _id: req.params.id, 
      user_id: req.user.id 
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recipe book for user
router.get('/recipe_books', authenticateToken, async (req, res) => {
  try {
    const recipeBooks = await RecipeBook.find({ user_id: req.user.id })
      .populate({
        path: 'recipe_id',
        populate: { path: 'author_id', select: 'email full_name' }
      })
      .sort({ added_at: -1 });
    res.json(recipeBooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add to recipe book
router.post('/recipe_books', authenticateToken, async (req, res) => {
  try {
    const recipeBook = new RecipeBook({
      user_id: req.user.id,
      recipe_id: req.body.recipe_id
    });
    await recipeBook.save();
    res.status(201).json(recipeBook);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Recipe already in book', code: '23505' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Remove from recipe book
router.delete('/recipe_books/:id', authenticateToken, async (req, res) => {
  try {
    const recipeBook = await RecipeBook.findOneAndDelete({ 
      _id: req.params.id, 
      user_id: req.user.id 
    });
    
    if (!recipeBook) {
      return res.status(404).json({ error: 'Recipe book entry not found' });
    }

    res.json({ message: 'Removed from recipe book' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get likes for recipe
router.get('/recipe_likes', async (req, res) => {
  try {
    const { recipe_id } = req.query;
    const likes = await RecipeLike.find({ recipe_id });
    res.json(likes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update like
router.post('/recipe_likes', authenticateToken, async (req, res) => {
  try {
    let like = await RecipeLike.findOne({
      user_id: req.user.id,
      recipe_id: req.body.recipe_id
    });

    if (like) {
      like.is_like = req.body.is_like;
      await like.save();
    } else {
      like = new RecipeLike({
        user_id: req.user.id,
        recipe_id: req.body.recipe_id,
        is_like: req.body.is_like
      });
      await like.save();
    }

    res.status(201).json(like);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete like
router.delete('/recipe_likes/:id', authenticateToken, async (req, res) => {
  try {
    const like = await RecipeLike.findOneAndDelete({ 
      _id: req.params.id, 
      user_id: req.user.id 
    });
    
    if (!like) {
      return res.status(404).json({ error: 'Like not found' });
    }

    res.json({ message: 'Like removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for recipe
router.get('/recipe_comments', async (req, res) => {
  try {
    const { recipe_id } = req.query;
    const comments = await RecipeComment.find({ recipe_id })
      .populate('user_id', 'email full_name')
      .sort({ created_at: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create comment
router.post('/recipe_comments', authenticateToken, async (req, res) => {
  try {
    const comment = new RecipeComment({
      ...req.body,
      user_id: req.user.id
    });
    await comment.save();
    await comment.populate('user_id', 'email full_name');
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update comment
router.put('/recipe_comments/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await RecipeComment.findOne({ 
      _id: req.params.id, 
      user_id: req.user.id 
    });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    comment.comment = req.body.comment;
    comment.updated_at = new Date();
    await comment.save();
    
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete comment
router.delete('/recipe_comments/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await RecipeComment.findOneAndDelete({ 
      _id: req.params.id, 
      user_id: req.user.id 
    });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
