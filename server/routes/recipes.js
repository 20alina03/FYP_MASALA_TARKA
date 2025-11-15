const express = require('express');
const Recipe = require('../models/Recipe');
const RecipeLike = require('../models/RecipeLike');
const RecipeComment = require('../models/RecipeComment');
const RecipeBook = require('../models/RecipeBook');
const GeneratedRecipe = require('../models/GeneratedRecipe');
const GeneratedRecipeBook = require('../models/GeneratedRecipeBook');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============= RECIPES =============

// Get all community recipes (excluding personal copies)
router.get('/recipes', async (req, res) => {
  try {
    // Only get recipes WITHOUT original_recipe_id (community recipes, not personal copies)
    const recipes = await Recipe.find({ 
      $or: [
        { original_recipe_id: { $exists: false } },
        { original_recipe_id: null }
      ]
    })
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

    console.log(`Retrieved ${recipesWithCounts.length} community recipes`);
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

// Update recipe - Allow only if user is author
router.put('/recipes/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Update recipe request:', {
      recipeId: req.params.id,
      userId: req.user.id,
      userEmail: req.user.email
    });

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      console.log('Recipe not found:', req.params.id);
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    console.log('Recipe details:', {
      authorId: recipe.author_id.toString(),
      currentUserId: req.user.id,
      hasOriginalId: !!recipe.original_recipe_id,
      originalId: recipe.original_recipe_id
    });
    
    // Check if user is the author
    const isAuthor = recipe.author_id.toString() === req.user.id;
    
    if (!isAuthor) {
      console.log('User not authorized to edit this recipe');
      return res.status(403).json({ error: 'Not authorized to edit this recipe' });
    }

    // User is the author, allow edit
    Object.assign(recipe, req.body);
    recipe.updated_at = new Date();
    await recipe.save();
    
    console.log('Recipe updated successfully:', recipe._id);
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

// Create or update like
router.post('/recipe_likes', authenticateToken, async (req, res) => {
  try {
    const { recipe_id, is_like } = req.body;
    const userId = req.user.id;
    
    console.log('Creating/updating like:', { user_id: userId, recipe_id, is_like });

    let like = await RecipeLike.findOne({
      user_id: userId,
      recipe_id: recipe_id
    });

    if (like) {
      console.log('Found existing like, updating:', like._id);
      like.is_like = is_like;
      await like.save();
      console.log('Like updated successfully:', like._id);
    } else {
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

// Get all recipe books for the authenticated user
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

// Add to recipe book - ALWAYS CREATE A PERSONAL COPY
router.post('/recipe_books', authenticateToken, async (req, res) => {
  try {
    const { recipe_id } = req.body;
    
    console.log('Adding to recipe book:', { user_id: req.user.id, recipe_id });

    // Get the original recipe
    const originalRecipe = await Recipe.findById(recipe_id);
    if (!originalRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check if user already has a personal copy of this recipe
    const existingBooks = await RecipeBook.find({ user_id: req.user.id }).populate('recipe_id');
    
    for (const book of existingBooks) {
      if (book.recipe_id) {
        // Check if this book entry points to the same original recipe
        if (book.recipe_id._id.toString() === recipe_id || 
            book.recipe_id.original_recipe_id?.toString() === recipe_id) {
          return res.status(400).json({ error: 'Recipe already in book', code: 'duplicate_key' });
        }
      }
    }

    // Generate a unique timestamp-based suffix to avoid duplicate key errors
    const timestamp = Date.now();
    const uniqueSuffix = `_copy_${req.user.id}_${timestamp}`;

    // ALWAYS create a personal copy
    const personalCopy = new Recipe({
      title: originalRecipe.title,
      description: originalRecipe.description + uniqueSuffix, // Add unique suffix to avoid duplicate key
      ingredients: originalRecipe.ingredients,
      instructions: originalRecipe.instructions,
      image_url: originalRecipe.image_url,
      cooking_time: originalRecipe.cooking_time,
      servings: originalRecipe.servings,
      difficulty: originalRecipe.difficulty,
      cuisine: originalRecipe.cuisine,
      calories: originalRecipe.calories,
      nutrition: originalRecipe.nutrition,
      author_id: req.user.id,
      original_recipe_id: recipe_id,
      created_at: new Date(),
    });

    await personalCopy.save();
    console.log('Personal copy created:', personalCopy._id);

    // Now remove the unique suffix from the description for display
    personalCopy.description = originalRecipe.description;
    await personalCopy.save();
    console.log('Personal copy description cleaned');

    // Save the personal copy to recipe book
    const book = new RecipeBook({
      user_id: req.user.id,
      recipe_id: personalCopy._id
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

// Remove from recipe book - DELETE THE PERSONAL COPY
router.delete('/recipe_books/:id', authenticateToken, async (req, res) => {
  try {
    const book = await RecipeBook.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Recipe book entry not found' });
    }
    
    if (book.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if this is a personal copy and delete it
    const recipe = await Recipe.findById(book.recipe_id);
    if (recipe && recipe.original_recipe_id) {
      // This is a personal copy, delete it
      await recipe.deleteOne();
      console.log('Personal copy deleted:', recipe._id);
    }

    // Delete the book entry
    await book.deleteOne();
    console.log('Recipe removed from book:', req.params.id);
    res.json({ message: 'Recipe removed from book' });
  } catch (error) {
    console.error('Remove from recipe book error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= GENERATED RECIPE BOOKS =============

// Get all generated recipe books
router.get('/generated_recipe_books', authenticateToken, async (req, res) => {
  try {
    const books = await GeneratedRecipeBook.find({ user_id: req.user.id })
      .populate('generated_recipe_id');
    console.log(`Retrieved ${books.length} generated recipe books for user:`, req.user.id);
    res.json(books);
  } catch (error) {
    console.error('Get generated recipe books error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add generated recipe to book
router.post('/generated_recipe_books', authenticateToken, async (req, res) => {
  try {
    const { generated_recipe_id } = req.body;
    
    console.log('Adding generated recipe to book:', { user_id: req.user.id, generated_recipe_id });

    const existing = await GeneratedRecipeBook.findOne({
      user_id: req.user.id,
      generated_recipe_id: generated_recipe_id
    });

    if (existing) {
      return res.status(400).json({ error: 'Generated recipe already in book', code: 'duplicate_key' });
    }

    const book = new GeneratedRecipeBook({
      user_id: req.user.id,
      generated_recipe_id: generated_recipe_id
    });

    await book.save();
    console.log('Generated recipe added to book:', book._id);

    await book.populate('generated_recipe_id');
    res.status(201).json(book);
  } catch (error) {
    console.error('Add generated recipe to book error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Generated recipe already in book', code: 'duplicate_key' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Remove generated recipe from book
router.delete('/generated_recipe_books/:id', authenticateToken, async (req, res) => {
  try {
    const book = await GeneratedRecipeBook.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Generated recipe book entry not found' });
    }
    
    if (book.user_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await book.deleteOne();
    console.log('Generated recipe removed from book:', req.params.id);
    res.json({ message: 'Generated recipe removed from book' });
  } catch (error) {
    console.error('Remove generated recipe from book error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= GENERATED RECIPES =============

// Get all generated recipes for the authenticated user
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

// Update generated recipe
router.put('/generated_recipes/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Update generated recipe request:', {
      recipeId: req.params.id,
      userId: req.user.id
    });

    const recipe = await GeneratedRecipe.findById(req.params.id);
    if (!recipe) {
      console.log('Generated recipe not found:', req.params.id);
      return res.status(404).json({ error: 'Generated recipe not found' });
    }
    
    console.log('Generated recipe found. User ID:', recipe.user_id);
    
    if (recipe.user_id.toString() !== req.user.id) {
      console.log('User not authorized to edit this generated recipe');
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(recipe, req.body);
    recipe.updated_at = new Date();
    await recipe.save();
    
    console.log('Generated recipe updated successfully:', recipe._id);
    res.json(recipe);
  } catch (error) {
    console.error('Update generated recipe error:', error);
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