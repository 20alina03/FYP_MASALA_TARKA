const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/recipe-finder';

// Define Schemas
const restaurantSchema = new mongoose.Schema({}, { strict: false });
const menuItemSchema = new mongoose.Schema({}, { strict: false });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// Categorization using keywords (VERY ACCURATE)
function categorizeMenuItem(name, description) {
  const text = `${name} ${description || ''}`.toLowerCase();

  // Exact matches first
  if (text.match(/^(starter|appetizer)/i)) return 'Starters & Appetizers';
  if (text.match(/^(soup)/i)) return 'Soups';
  if (text.match(/^(salad)/i)) return 'Salads';
  if (text.match(/^(breakfast)/i)) return 'Breakfast';
  
  // Specific patterns
  if (text.match(/biryani|pulao|rice bowl|fried rice|steamed rice/i)) 
    return 'Rice & Biryani';
  if (text.match(/burger|sandwich|wrap|sub\b/i)) 
    return 'Burgers & Sandwiches';
  if (text.match(/pizza/i)) 
    return 'Pizza';
  if (text.match(/pasta|noodles|spaghetti|macaroni|chow mein|lo mein|ramen/i)) 
    return 'Noodles & Pasta';
  if (text.match(/sushi|roll|maki|california|sashimi|nigiri/i)) 
    return 'Sushi & Rolls';
  if (text.match(/bbq|grill|kebab|tikka|boti|seekh|tandoor/i)) 
    return 'BBQ & Grills';
  if (text.match(/karahi|curry|nihari|haleem|korma|qorma|masala|vindaloo/i)) 
    return 'Main Course';
  
  // Drinks
  if (text.match(/shake|smoothie|milkshake|frappe/i)) 
    return 'Shakes & Smoothies';
  if (text.match(/coffee|cappuccino|latte|espresso|mocha|americano/i)) 
    return 'Coffee & Tea';
  if (text.match(/tea|chai|green tea|iced tea/i)) 
    return 'Coffee & Tea';
  if (text.match(/juice|soda|coke|pepsi|sprite|fanta|water|drink|beverage|cola/i)) 
    return 'Beverages & Drinks';
  
  // Desserts & Sweets
  if (text.match(/dessert|cake|ice cream|sweet|kheer|gulab jamun|brownie|pudding|custard|mousse/i)) 
    return 'Desserts & Sweets';
  
  // Starters
  if (text.match(/spring roll|samosa|pakora|wing|nugget|popcorn chicken|tender/i)) 
    return 'Starters & Appetizers';
  
  // Deals & Combos
  if (text.match(/deal|combo|platter|family|special|bucket|meal|box|value/i)) 
    return 'Special Deals';
  
  // Sides
  if (text.match(/fries|side|raita|chutney|coleslaw|wedge|dip|sauce\b/i)) 
    return 'Sides';
  
  // Breakfast
  if (text.match(/paratha|omelette|halwa puri|puri|chanay|nashta/i)) 
    return 'Breakfast';
  
  // Soup
  if (text.match(/soup|broth/i)) 
    return 'Soups';
  
  // Salad
  if (text.match(/salad|coleslaw/i)) 
    return 'Salads';

  return 'Other';
}

// Determine cuisine based on menu items
function determineCuisines(restaurantName, menuItems) {
  const nameText = restaurantName.toLowerCase();
  const allItems = menuItems.map(m => `${m.name} ${m.description || ''}`).join(' ').toLowerCase();
  const cuisines = [];

  // Check restaurant name first
  if (nameText.match(/sushi|japanese/i)) cuisines.push('Japanese');
  if (nameText.match(/pizza|italian/i)) cuisines.push('Italian');
  if (nameText.match(/chinese|wok/i)) cuisines.push('Chinese');
  if (nameText.match(/burger|kfc|mcdonald|hardee|subway/i)) cuisines.push('Fast Food');
  if (nameText.match(/bbq|grill|tikka/i)) cuisines.push('BBQ');

  // Check menu items
  if (allItems.match(/sushi|maki|sashimi|tempura|teriyaki/i) && !cuisines.includes('Japanese')) 
    cuisines.push('Japanese');
  if (allItems.match(/biryani|pulao|karahi|nihari|tikka|seekh|haleem/i) && !cuisines.includes('Pakistani')) 
    cuisines.push('Pakistani');
  if (allItems.match(/curry|tandoori|masala|paneer/i) && !cuisines.includes('Indian')) 
    cuisines.push('Indian');
  if (allItems.match(/chow mein|fried rice|szechuan|manchurian/i) && !cuisines.includes('Chinese')) 
    cuisines.push('Chinese');
  if (allItems.match(/pizza|pasta|lasagna|risotto/i) && !cuisines.includes('Italian')) 
    cuisines.push('Italian');
  if (allItems.match(/burger|fries|nuggets|hotdog/i) && !cuisines.includes('Fast Food')) 
    cuisines.push('Fast Food');
  if (allItems.match(/taco|burrito|nacho|quesadilla/i) && !cuisines.includes('Mexican')) 
    cuisines.push('Mexican');
  if (allItems.match(/kebab|hummus|shawarma|falafel/i) && !cuisines.includes('Arabic')) 
    cuisines.push('Arabic');
  if (allItems.match(/pad thai|tom yum|green curry/i) && !cuisines.includes('Thai')) 
    cuisines.push('Thai');
  if (allItems.match(/steak|bbq/i) && !cuisines.includes('BBQ')) 
    cuisines.push('BBQ');

  return cuisines.length > 0 ? cuisines.slice(0, 3) : ['Fast Food'];
}

// Main processing function
async function processAllRestaurants() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const restaurants = await Restaurant.find({}).lean();
    console.log(`📊 Found ${restaurants.length} restaurants\n`);
    console.log('🚀 Starting categorization (keyword-based, fast & accurate)...\n');

    let processedCount = 0;
    let totalItemsCategorized = 0;
    const startTime = Date.now();

    for (const restaurant of restaurants) {
      try {
        const menuItems = await MenuItem.find({ 
          restaurant_id: restaurant._id 
        }).lean();

        if (menuItems.length === 0) {
          continue;
        }

        // Determine cuisines
        const cuisineTypes = determineCuisines(restaurant.name, menuItems);

        // Update restaurant cuisines
        await Restaurant.updateOne(
          { _id: restaurant._id },
          { 
            $set: { 
              cuisines: cuisineTypes,
              updated_at: new Date()
            }
          }
        );

        // Categorize and update menu items
        const bulkOps = menuItems.map(item => ({
          updateOne: {
            filter: { _id: item._id },
            update: { 
              $set: { 
                category: categorizeMenuItem(item.name, item.description),
                updated_at: new Date()
              }
            }
          }
        }));

        if (bulkOps.length > 0) {
          await MenuItem.bulkWrite(bulkOps);
        }

        totalItemsCategorized += menuItems.length;
        processedCount++;

        // Progress update every 10 restaurants
        if (processedCount % 10 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (processedCount / (elapsed / 60)).toFixed(1);
          console.log(`✅ Progress: ${processedCount}/${restaurants.length} restaurants (${rate} restaurants/min)`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${restaurant.name}:`, error.message);
        continue;
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 PROCESSING COMPLETE!');
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Successfully processed: ${processedCount} restaurants`);
    console.log(`📋 Total items categorized: ${totalItemsCategorized}`);
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log(`⚡ Average: ${(processedCount / (totalTime / 60)).toFixed(1)} restaurants/min`);
    console.log(`${'='.repeat(60)}\n`);

    // Show sample category distribution
    console.log('📊 Overall Category Distribution:\n');
    const categorySummary = await MenuItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    categorySummary.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count} items`);
    });

  } catch (error) {
    console.error('❌ Fatal Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
console.log('🚀 Starting Menu Item Categorization (Keyword-Based)...\n');
console.log('💡 Using smart keyword matching for fast & accurate categorization\n');

processAllRestaurants().then(() => {
  console.log('✨ Script finished successfully!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});