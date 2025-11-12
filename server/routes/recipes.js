const express = require('express');
const Recipe = require('../models/Recipe');
const RecipeLike = require('../models/RecipeLike');
const RecipeComment = require('../models/RecipeComment');
const RecipeBook = require('../models/RecipeBook');
const GeneratedRecipe = require('../models/GeneratedRecipe');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============= RECIPES =============

// Get all recipes with likes and comments count
router.get('/recipes', async (req, res) => {
  try {
    const recipes = await Recipe.find()
      .populate('author_id', 'full_name email')
      .sort({ created_at: -1 });

    // Get all likes and comments
    const allLikes = await RecipeLike.find();
    const allComments = await RecipeComment.find();

    // Add counts to each recipe
    const recipesWithCounts = recipes.map(recipe => {
      const recipeId = recipe._id.toString();
      
      // Count likes and dislikes for this recipe
      const recipeLikes = allLikes.filter(like => like.recipe_id.toString() === recipeId);
      const likes_count = recipeLikes.filter(like => like.is_like === true).length;
      const dislikes_count = recipeLikes.filter(like => like.is_like === false).length;
      
      // Count comments for this recipe
      const comments_count = allComments.filter(comment => comment.recipe_id.toString() === recipeId).length;

      return {
        ...recipe.toObject(),
        likes_count,
        dislikes_count,
        comments_count
      };
    });

    console.log(`Retrieved ${recipesWithCounts.length} recipes with counts`);
    res.json(recipesWithCounts);
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single recipe with counts
router.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('author_id', 'full_name email');
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Get likes and comments for this recipe
    const recipeLikes = await RecipeLike.find({ recipe_id: req.params.id });
    const recipeComments = await RecipeComment.find({ recipe_id: req.params.id });

    const likes_count = recipeLikes.filter(like => like.is_like === true).length;
    const dislikes_count = recipeLikes.filter(like => like.is_like === false).length;
    const comments_count = recipeComments.length;

    const recipeWithCounts = {
      ...recipe.toObject(),
      likes_count,
      dislikes_count,
      comments_count
    };

    res.json(recipeWithCounts);
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create recipe
router.post('/recipes', authenticateToken, async (req, res) => {
  try {
    console.log('Creating recipe for user:', req.user.id);
    const recipe = new Recipe({
      ...req.body,
      author_id: req.user.id
    });
    await recipe.save();
    console.log('Recipe created:', recipe._id);
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update recipe
router.put('/recipes/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Check if user is the author
    if (recipe.author_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(recipe, req.body);
    recipe.updated_at = new Date();
    await recipe.save();
    console.log('Recipe updated:', recipe._id);
    res.json(recipe);
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete recipe
router.delete('/recipes/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Check if user is the author
    if (recipe.author_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await recipe.deleteOne();
    console.log('Recipe deleted:', req.params.id);
    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= RECIPE LIKES =============

// Get all likes
router.get('/recipe_likes', async (req, res) => {
  try {
    const likes = await RecipeLike.find();
    console.log(`Retrieved ${likes.length} likes`);
    res.json(likes);
  } catch (error) {
    console.error('Get likes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update like - FIXED VERSION
router.post('/recipe_likes', authenticateToken, async (req, res) => {
  try {
    const { recipe_id, is_like, user_id } = req.body;
    
    // Use the authenticated user's ID, not from body
    const userId = req.user.id;
    
    console.log('Creating/updating like:', { 
      user_id: userId, 
      recipe_id, 
      is_like 
    });

    // Check if like already exists for THIS SPECIFIC RECIPE and USER
    let like = await RecipeLike.findOne({
      user_id: userId,
      recipe_id: recipe_id
    });

    if (like) {
      // Update existing like
      console.log('Found existing like, updating:', like._id);
      like.is_like = is_like;
      await like.save();
      console.log('Like updated successfully:', like._id);
    } else {
      // Create new like
      console.log('No existing like found, creating new one');
      like = new RecipeLike({
        user_id: userId,
        recipe_id: recipe_id,
        is_like: is_like
      });
      await like.save();
      console.log('Like created successfully:', like._id);
    }

    res.status(201).json(like);
  } catch (error) {
    console.error('Create/update like error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update like
router.put('/recipe_likes/:id', authenticateToken, async (req, res) => {
  try {
    const like = await RecipeLike.findById(req.params.id);
    if (!like) {
      return res.status(404).json({ error: 'Like not found' });
    }
    
    // Check if user owns this like
    if (like.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(like, req.body);
    await like.save();
    console.log('Like updated:', like._id);
    res.json(like);
  } catch (error) {
    console.error('Update like error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete like
router.delete('/recipe_likes/:id', authenticateToken, async (req, res) => {
  try {
    const like = await RecipeLike.findById(req.params.id);
    if (!like) {
      return res.status(404).json({ error: 'Like not found' });
    }
    
    // Check if user owns this like
    if (like.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await like.deleteOne();
    console.log('Like deleted:', req.params.id);
    res.json({ message: 'Like deleted' });
  } catch (error) {
    console.error('Delete like error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= RECIPE COMMENTS =============

// Get all comments
router.get('/recipe_comments', async (req, res) => {
  try {
    const comments = await RecipeComment.find()
      .populate('user_id', 'full_name email')
      .sort({ created_at: -1 });
    console.log(`Retrieved ${comments.length} comments`);
    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create comment
router.post('/recipe_comments', authenticateToken, async (req, res) => {
  try {
    const { recipe_id, comment, user_name } = req.body;
    
    console.log('Creating comment:', { 
      user_id: req.user.id, 
      recipe_id, 
      comment: comment.substring(0, 50) + '...' 
    });

    const newComment = new RecipeComment({
      recipe_id: recipe_id,
      user_id: req.user.id,
      comment: comment,
      user_name: user_name || req.user.full_name || req.user.email || 'Anonymous'
    });

    await newComment.save();
    console.log('Comment created:', newComment._id);

    // Populate user details
    await newComment.populate('user_id', 'full_name email');
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update comment
router.put('/recipe_comments/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await RecipeComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if user owns this comment
    if (comment.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(comment, req.body);
    comment.updated_at = new Date();
    await comment.save();
    console.log('Comment updated:', comment._id);
    res.json(comment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete comment
router.delete('/recipe_comments/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await RecipeComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if user owns this comment
    if (comment.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await comment.deleteOne();
    console.log('Comment deleted:', req.params.id);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= RECIPE BOOKS =============

// Get all recipe books
router.get('/recipe_books', authenticateToken, async (req, res) => {
  try {
    const books = await RecipeBook.find({ user_id: req.user.id })
      .populate('recipe_id');
    console.log(`Retrieved ${books.length} recipe books for user:`, req.user.id);
    res.json(books);
  } catch (error) {
    console.error('Get recipe books error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add to recipe book
router.post('/recipe_books', authenticateToken, async (req, res) => {
  try {
    const { recipe_id } = req.body;
    
    console.log('Adding to recipe book:', { user_id: req.user.id, recipe_id });

    // Check if already exists
    const existing = await RecipeBook.findOne({
      user_id: req.user.id,
      recipe_id: recipe_id
    });

    if (existing) {
      return res.status(400).json({ error: 'Recipe already in book', code: 'duplicate_key' });
    }

    const book = new RecipeBook({
      user_id: req.user.id,
      recipe_id: recipe_id
    });

    await book.save();
    console.log('Recipe added to book:', book._id);

    await book.populate('recipe_id');
    res.status(201).json(book);
  } catch (error) {
    console.error('Add to recipe book error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Recipe already in book', code: 'duplicate_key' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Remove from recipe book
router.delete('/recipe_books/:id', authenticateToken, async (req, res) => {
  try {
    const book = await RecipeBook.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Recipe book entry not found' });
    }
    
    // Check if user owns this entry
    if (book.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await book.deleteOne();
    console.log('Recipe removed from book:', req.params.id);
    res.json({ message: 'Recipe removed from book' });
  } catch (error) {
    console.error('Remove from recipe book error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= GENERATED RECIPES =============

// Get all generated recipes
router.get('/generated_recipes', authenticateToken, async (req, res) => {
  try {
    const recipes = await GeneratedRecipe.find({ user_id: req.user.id })
      .sort({ generated_at: -1 });
    console.log(`Retrieved ${recipes.length} generated recipes for user:`, req.user.id);
    res.json(recipes);
  } catch (error) {
    console.error('Get generated recipes error:', error);
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
    console.log('Generated recipe created:', recipe._id);
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Create generated recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete generated recipe
router.delete('/generated_recipes/:id', authenticateToken, async (req, res) => {
  try {
    const recipe = await GeneratedRecipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Generated recipe not found' });
    }
    
    // Check if user owns this recipe
    if (recipe.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await recipe.deleteOne();
    console.log('Generated recipe deleted:', req.params.id);
    res.json({ message: 'Generated recipe deleted' });
  } catch (error) {
    console.error('Delete generated recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;