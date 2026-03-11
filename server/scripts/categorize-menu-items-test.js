const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI('AIzaSyBtQy-olVcQcAoG6JydtfaChh-nGVIXrbM');

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/recipe-finder';

// Define Schemas
const restaurantSchema = new mongoose.Schema({}, { strict: false });
const menuItemSchema = new mongoose.Schema({}, { strict: false });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// Standard food categories
const STANDARD_CATEGORIES = [
  'Starters & Appetizers',
  'Main Course',
  'Rice & Biryani',
  'Noodles & Pasta',
  'Burgers & Sandwiches',
  'Pizza',
  'Salads',
  'Soups',
  'Desserts & Sweets',
  'Beverages & Drinks',
  'Shakes & Smoothies',
  'Coffee & Tea',
  'Sides',
  'Sushi & Rolls',
  'BBQ & Grills',
  'Special Deals',
  'Combos & Platters',
  'Breakfast',
  'Other'
];

// Delay function to respect API rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to categorize menu items using Gemini AI
async function categorizeMenuItems(restaurantName, menuItems) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Prepare menu items for AI
    const itemsList = menuItems.map((item, idx) => 
      `${idx + 1}. ${item.name} - ${item.description || 'No description'}`
    ).join('\n');

    const prompt = `You are a food categorization expert. Given a restaurant and its menu items, categorize each item into one of these categories:

${STANDARD_CATEGORIES.join(', ')}

Restaurant: ${restaurantName}

Menu Items:
${itemsList}

Instructions:
1. Categorize each item by its number
2. Choose the most appropriate category from the list above
3. Return ONLY a JSON array with this exact format:
[
  {"item_number": 1, "category": "Category Name"},
  {"item_number": 2, "category": "Category Name"}
]

Important:
- Use exact category names from the list
- No explanations, just the JSON array
- If unsure, use "Other"

JSON Response:`;

    console.log('      🤖 Sending request to Gemini AI...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('      📥 Received AI response');

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('      ⚠️  No valid JSON found, using fallback');
      throw new Error('No valid JSON found in AI response');
    }

    const categorizations = JSON.parse(jsonMatch[0]);
    console.log(`      ✅ Successfully categorized ${categorizations.length} items`);
    
    // Map categories back to menu items
    const categorizedItems = menuItems.map((item, idx) => {
      const cat = categorizations.find(c => c.item_number === idx + 1);
      return {
        _id: item._id,
        name: item.name,
        category: cat ? cat.category : 'Other'
      };
    });

    return categorizedItems;

  } catch (error) {
    console.error('      ❌ AI Categorization Error:', error.message);
    console.log('      🔄 Using fallback categorization...');
    // Fallback: basic categorization
    return menuItems.map(item => ({
      _id: item._id,
      name: item.name,
      category: basicCategorize(item.name, item.description)
    }));
  }
}

// Fallback basic categorization using keywords
function basicCategorize(name, description) {
  const text = `${name} ${description || ''}`.toLowerCase();

  if (text.match(/starter|appetizer|spring roll|samosa|pakora|wing/i)) 
    return 'Starters & Appetizers';
  if (text.match(/biryani|pulao|rice|fried rice/i)) 
    return 'Rice & Biryani';
  if (text.match(/burger|sandwich|wrap/i)) 
    return 'Burgers & Sandwiches';
  if (text.match(/pizza/i)) 
    return 'Pizza';
  if (text.match(/pasta|noodles|spaghetti|macaroni/i)) 
    return 'Noodles & Pasta';
  if (text.match(/shake|smoothie|milkshake/i)) 
    return 'Shakes & Smoothies';
  if (text.match(/coffee|cappuccino|latte|espresso|tea/i)) 
    return 'Coffee & Tea';
  if (text.match(/juice|soda|coke|pepsi|water|drink|beverage/i)) 
    return 'Beverages & Drinks';
  if (text.match(/dessert|cake|ice cream|sweet|kheer|gulab jamun|brownie/i)) 
    return 'Desserts & Sweets';
  if (text.match(/soup/i)) 
    return 'Soups';
  if (text.match(/salad/i)) 
    return 'Salads';
  if (text.match(/sushi|roll|maki|california/i)) 
    return 'Sushi & Rolls';
  if (text.match(/bbq|grill|kebab|tikka|boti/i)) 
    return 'BBQ & Grills';
  if (text.match(/deal|combo|platter|family|special/i)) 
    return 'Special Deals';
  if (text.match(/fries|side|raita|chutney/i)) 
    return 'Sides';
  if (text.match(/breakfast|paratha|omelette|halwa puri/i)) 
    return 'Breakfast';
  if (text.match(/karahi|curry|nihari|haleem|korma/i)) 
    return 'Main Course';

  return 'Other';
}

// Function to determine cuisine types for a restaurant
async function categorizeCuisine(restaurantName, menuItems) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const itemNames = menuItems.slice(0, 20).map(item => item.name).join(', ');

    const prompt = `Based on this restaurant and its menu items, determine its cuisine types.

Restaurant: ${restaurantName}
Menu Items: ${itemNames}

Choose 1-3 most appropriate cuisine types from this list:
Pakistani, Indian, Chinese, Italian, Japanese, Thai, Mexican, Mediterranean, American, Fast Food, Continental, Arabic, Korean, Seafood, Desserts, BBQ

Return ONLY a JSON array of cuisine types:
["Cuisine1", "Cuisine2"]

JSON Response:`;

    console.log('   🤖 Analyzing cuisine types...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.log('   ⚠️  Could not determine cuisines, using default');
      return ['Fast Food']; // Default fallback
    }

    const cuisines = JSON.parse(jsonMatch[0]);
    return cuisines.length > 0 ? cuisines : ['Fast Food'];

  } catch (error) {
    console.error('   ❌ Cuisine Categorization Error:', error.message);
    return ['Fast Food']; // Fallback
  }
}

// Main processing function - TEST MODE
async function processRestaurantsTest() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ⚠️ TEST MODE - Only get 2 restaurants with menu items
    console.log('🧪 TEST MODE: Processing only 2 restaurants\n');
    
    const allRestaurants = await Restaurant.find({}).lean();
    console.log(`📊 Total restaurants in database: ${allRestaurants.length}`);
    
    // Filter restaurants that have menu items
    let testRestaurants = [];
    for (const restaurant of allRestaurants) {
      const menuCount = await MenuItem.countDocuments({ restaurant_id: restaurant._id });
      if (menuCount > 0) {
        testRestaurants.push(restaurant);
        if (testRestaurants.length === 2) break;
      }
    }

    if (testRestaurants.length === 0) {
      console.log('❌ No restaurants with menu items found!');
      return;
    }

    console.log(`🎯 Selected ${testRestaurants.length} restaurants for testing:`);
    testRestaurants.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name}`);
    });
    console.log('');

    let processedCount = 0;
    let errorCount = 0;
    let totalItemsCategorized = 0;

    for (const restaurant of testRestaurants) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🍽️  Processing: ${restaurant.name}`);
        console.log(`${'='.repeat(60)}`);

        // Get menu items for this restaurant
        const menuItems = await MenuItem.find({ 
          restaurant_id: restaurant._id 
        }).lean();

        if (menuItems.length === 0) {
          console.log('⚠️  No menu items found, skipping...');
          continue;
        }

        console.log(`📋 Found ${menuItems.length} menu items`);

        // Show current categories (before processing)
        const currentCategories = [...new Set(menuItems.map(item => item.category || 'Not Set'))];
        console.log(`📌 Current categories: ${currentCategories.join(', ')}`);

        // Step 1: Categorize cuisine types
        console.log('\n🔍 Step 1: Determining cuisine types...');
        const cuisineTypes = await categorizeCuisine(restaurant.name, menuItems);
        console.log(`✅ Detected Cuisines: ${cuisineTypes.join(', ')}`);

        // Update restaurant cuisines (TEST MODE - showing what would be updated)
        console.log('   📝 Updating restaurant document...');
        await Restaurant.updateOne(
          { _id: restaurant._id },
          { 
            $set: { 
              cuisines: cuisineTypes,
              updated_at: new Date()
            }
          }
        );
        console.log('   ✅ Restaurant updated');

        // Wait to respect rate limits
        await delay(2000);

        // Step 2: Categorize menu items in batches
        console.log('\n📑 Step 2: Categorizing menu items...');
        const batchSize = 30; // Process 30 items at a time
        const batches = [];
        
        for (let i = 0; i < menuItems.length; i += batchSize) {
          batches.push(menuItems.slice(i, i + batchSize));
        }

        console.log(`   Processing ${batches.length} batch(es)...`);

        let categorizedCount = 0;
        let categoryChanges = [];

        for (let i = 0; i < batches.length; i++) {
          console.log(`\n   📦 Batch ${i + 1}/${batches.length} (${batches[i].length} items):`);
          
          const categorizedItems = await categorizeMenuItems(
            restaurant.name, 
            batches[i]
          );

          // Show sample categorizations
          console.log('\n      📋 Sample categorizations:');
          categorizedItems.slice(0, 5).forEach(item => {
            console.log(`         • ${item.name} → ${item.category}`);
          });
          if (categorizedItems.length > 5) {
            console.log(`         ... and ${categorizedItems.length - 5} more items`);
          }

          // Update each menu item
          console.log('\n      💾 Updating database...');
          for (const item of categorizedItems) {
            const oldItem = menuItems.find(m => m._id.equals(item._id));
            const oldCategory = oldItem?.category || 'Not Set';
            
            await MenuItem.updateOne(
              { _id: item._id },
              { 
                $set: { 
                  category: item.category,
                  updated_at: new Date()
                }
              }
            );
            
            if (oldCategory !== item.category) {
              categoryChanges.push({
                name: item.name,
                from: oldCategory,
                to: item.category
              });
            }
            
            categorizedCount++;
          }
          console.log(`      ✅ Updated ${categorizedItems.length} items`);

          // Wait between batches to respect rate limits
          if (i < batches.length - 1) {
            console.log('      ⏳ Waiting 3 seconds before next batch...');
            await delay(3000);
          }
        }

        totalItemsCategorized += categorizedCount;
        console.log(`\n✅ Successfully categorized ${categorizedCount} menu items`);

        // Show category changes
        if (categoryChanges.length > 0) {
          console.log(`\n🔄 Category Changes (${categoryChanges.length} items):`);
          categoryChanges.slice(0, 10).forEach(change => {
            console.log(`   • ${change.name}`);
            console.log(`     From: "${change.from}" → To: "${change.to}"`);
          });
          if (categoryChanges.length > 10) {
            console.log(`   ... and ${categoryChanges.length - 10} more changes`);
          }
        }

        // Summary by category (after processing)
        const categorySummary = await MenuItem.aggregate([
          { $match: { restaurant_id: restaurant._id } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);

        console.log('\n📊 Final Category Distribution:');
        categorySummary.forEach(cat => {
          console.log(`   ${cat._id}: ${cat.count} items`);
        });

        processedCount++;

      } catch (error) {
        console.error(`\n❌ Error processing ${restaurant.name}:`, error.message);
        console.error(error.stack);
        errorCount++;
      }
    }

    // Final Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 TEST COMPLETE!');
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Successfully processed: ${processedCount} restaurants`);
    console.log(`📋 Total items categorized: ${totalItemsCategorized}`);
    console.log(`❌ Errors: ${errorCount} restaurants`);
    console.log(`${'='.repeat(60)}\n`);

    console.log('💡 Next Steps:');
    console.log('   1. Review the categorizations above');
    console.log('   2. If satisfied, run the full script: node categorize-menu-items.js');
    console.log('   3. To test more restaurants, edit the limit in the script\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test script
console.log('🚀 Starting Menu Item Categorization - TEST MODE\n');
console.log('⚠️  This will process only 2 restaurants for testing\n');

processRestaurantsTest().then(() => {
  console.log('✨ Test script finished!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});