const fs = require('fs');
const path = require('path');

const requiredModels = [
  'User. js',
  'Profile.js',
  'Recipe.js',
  'RecipeLike.js',
  'RecipeComment.js',
  'RecipeBook.js',
  'GeneratedRecipe.js',
  'GeneratedRecipeBook.js',
  'Restaurant.js',
  'RestaurantAdmin.js',
  'RestaurantReview.js',
  'MenuItem.js',
  'MenuCategory.js',
  'MenuItemReview.js',
  'Report.js',
  'CommunityPost.js',
  'PostLike.js',
  'UserRole.js'
];

console.log('🔍 Checking for required model files...\n');

const modelsDir = path.join(__dirname, '..', 'models');
let allExist = true;
let missingFiles = [];

requiredModels. forEach(model => {
  const filePath = path.join(modelsDir, model);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    console.log(`✅ ${model}`);
  } else {
    console.log(`❌ ${model} - MISSING`);
    allExist = false;
    missingFiles.push(model);
  }
});

console.log('\n' + '='.repeat(50));

if (allExist) {
  console.log('✅ All model files are present!');
} else {
  console.log(`❌ Missing ${missingFiles.length} model file(s):`);
  missingFiles.forEach(file => console.log(`   - ${file}`));
  console.log('\nPlease create the missing files before starting the server.');
}

console.log('='.repeat(50) + '\n');

process.exit(allExist ? 0 : 1);