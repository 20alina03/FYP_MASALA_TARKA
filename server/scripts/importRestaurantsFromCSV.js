const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');

// Connect to MongoDB (removed deprecated options)
mongoose.connect(process. env.MONGODB_URI || 'mongodb://localhost:27017/recipe-finder')
  .then(() => console.log('📦 Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Helper function to parse CSV
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Import restaurants from foodpanda_restaurants.csv
async function importRestaurants() {
  try {
    console.log('Starting restaurant import...');
    
    const restaurantData = await parseCSV('../data/foodpanda_restaurants.csv');
    
    const restaurantMap = new Map();
    const skippedDuplicates = [];
    
    for (const row of restaurantData) {
      const restaurantCode = row.code?. trim();
      
      if (!restaurantCode) {
        console.warn('⚠️  Skipping row with missing restaurant code');
        continue;
      }
      
      // Skip duplicate restaurant codes (keep first occurrence)
      if (restaurantMap.has(restaurantCode)) {
        skippedDuplicates.push(restaurantCode);
        continue;
      }
      
      // Validate required fields
      if (!row.name || !row.latitude || !row.longitude) {
        console.warn(`⚠️  Skipping restaurant ${restaurantCode}:  missing required fields`);
        continue;
      }
      
      const restaurant = {
        restaurant_code: restaurantCode,
        name: row. name.trim(),
        rating: parseFloat(row.rating) || 0,
        review_count: parseInt(row.review_number) || 0,
        address: row.address_line2?. trim() || 'Address not available', // ✅ Fixed:  Always provide a value
        city: 'Lahore',
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        minimum_order_amount:  parseFloat(row.minimum_order_amount) || 0,
        delivery_fee: parseFloat(row.minimum_delivery_fee) || 0,
        image_url: row.hero_listing_image?.trim() || '',
        distance: parseFloat(row.distance) || 0,
        url_key: row.url_key?.trim() || '',
        cuisine_types: [],
        delivery_time: '30-40 min',
        admin_id: null,
        is_active: true,
        is_approved: true,
        has_menu: false,
        created_at: new Date(),
        updated_at:  new Date()
      };
      
      restaurantMap.set(restaurantCode, restaurant);
    }
    
    if (skippedDuplicates.length > 0) {
      console.log(`⚠️  Skipped ${skippedDuplicates.length} duplicate restaurants`);
    }
    
    // Insert all restaurants
    const restaurantsArray = Array.from(restaurantMap.values());
    
    if (restaurantsArray.length === 0) {
      console.error('❌ No valid restaurants to import');
      return new Map();
    }
    
    const insertedRestaurants = await Restaurant. insertMany(restaurantsArray);
    
    console.log(`✅ Imported ${insertedRestaurants. length} restaurants`);
    
    // Create a map of restaurant_code to MongoDB _id
    const codeToIdMap = new Map();
    insertedRestaurants.forEach(r => {
      codeToIdMap.set(r.restaurant_code, r._id);
    });
    
    return codeToIdMap;
    
  } catch (error) {
    console.error('Error importing restaurants:', error);
    throw error;
  }
}

// Import menu items from menu_progress. csv
async function importMenuItems(codeToIdMap) {
  try {
    console.log('\nStarting menu items import...');
    
    const menuData = await parseCSV('../data/menu_progress.csv');
    
    const categoryMap = new Map();
    const menuItemsToInsert = [];
    const seenItems = new Set();
    
    let skippedNoRestaurant = 0;
    let skippedDuplicates = 0;
    let skippedInvalid = 0;
    
    const restaurantsWithMenu = new Set();
    
    for (const row of menuData) {
      const restaurantCode = row.restaurant_code?.trim();
      
      if (!restaurantCode) {
        skippedInvalid++;
        continue;
      }
      
      const restaurantId = codeToIdMap.get(restaurantCode);
      
      if (! restaurantId) {
        skippedNoRestaurant++;
        continue;
      }
      
      const dishName = row.dish_name?.trim();
      const price = parseFloat(row.price);
      
      if (! dishName || isNaN(price) || price <= 0) {
        skippedInvalid++;
        continue;
      }
      
      const itemKey = `${restaurantId}-${dishName}-${price}`;
      
      if (seenItems.has(itemKey)) {
        skippedDuplicates++;
        continue;
      }
      
      seenItems.add(itemKey);
      restaurantsWithMenu.add(restaurantId. toString());
      
      const categoryName = row.category?. trim() || 'All Categories';
      const categoryKey = `${restaurantId}-${categoryName}`;
      let categoryId = categoryMap.get(categoryKey);
      
      if (!categoryId) {
        try {
          const category = new MenuCategory({
            restaurant_id: restaurantId,
            name: categoryName,
            display_order: categoryMap.size,
            is_active: true,
            created_at: new Date()
          });
          
          const savedCategory = await category.save();
          categoryId = savedCategory._id;
          categoryMap.set(categoryKey, categoryId);
        } catch (error) {
          console.error(`Error creating category ${categoryName}:`, error.message);
          continue;
        }
      }
      
      const originalPrice = parseFloat(row.original_price) || price;
      const menuItem = {
        restaurant_id: restaurantId,
        category_id: categoryId,
        name: dishName,
        description: row.description?.trim() || '',
        price: price,
        original_price: originalPrice,
        image_url:  row.image_url?.trim() || '',
        is_popular: row.is_popular?. toLowerCase() === 'yes',
        is_available: true,
        rating: 0,
        review_count:  0,
        created_at: new Date(row.scraped_date || Date.now()),
        updated_at: new Date()
      };
      
      if (originalPrice > price) {
        menuItem.discount_percentage = Math.round(
          ((originalPrice - price) / originalPrice) * 100
        );
      }
      
      menuItemsToInsert.push(menuItem);
    }
    
    if (menuItemsToInsert.length > 0) {
      await MenuItem.insertMany(menuItemsToInsert);
      console.log(`✅ Imported ${menuItemsToInsert.length} menu items`);
      console.log(`✅ Created ${categoryMap.size} menu categories`);
      
      await Restaurant.updateMany(
        { _id: { $in: Array.from(restaurantsWithMenu).map(id => new mongoose.Types.ObjectId(id)) } },
        { $set: { has_menu: true, updated_at: new Date() } }
      );
      
      console.log(`✅ Marked ${restaurantsWithMenu.size} restaurants as having menus`);
    }
    
    console.log('\n📊 Menu Import Statistics:');
    console.log(`   ✅ Successfully imported:  ${menuItemsToInsert.length}`);
    console.log(`   ⚠️  Skipped (no restaurant): ${skippedNoRestaurant}`);
    console.log(`   ⚠️  Skipped (duplicates): ${skippedDuplicates}`);
    console.log(`   ⚠️  Skipped (invalid data): ${skippedInvalid}`);
    
    const totalRestaurants = codeToIdMap.size;
    const restaurantsWithoutMenu = totalRestaurants - restaurantsWithMenu.size;
    
    if (restaurantsWithoutMenu > 0) {
      console.log(`\n⚠️  ${restaurantsWithoutMenu} restaurants do not have menu data`);
    }
    
  } catch (error) {
    console.error('Error importing menu items:', error);
    throw error;
  }
}

// Main import function
async function main() {
  try {
    console.log('🚀 Starting CSV import process...\n');
    
    const restaurantsCsvPath = '../data/foodpanda_restaurants.csv';
    const menuCsvPath = '../data/menu_progress.csv';
    
    if (!fs.existsSync(restaurantsCsvPath)) {
      throw new Error(`Restaurant CSV file not found: ${restaurantsCsvPath}`);
    }
    
    if (!fs. existsSync(menuCsvPath)) {
      throw new Error(`Menu CSV file not found: ${menuCsvPath}`);
    }
    
    console.log('🗑️  Clearing existing imported data...');
    await Restaurant. deleteMany({ admin_id: null });
    await MenuItem.deleteMany({});
    await MenuCategory.deleteMany({});
    console.log('✅ Cleared\n');
    
    const codeToIdMap = await importRestaurants();
    
    if (codeToIdMap.size === 0) {
      throw new Error('No restaurants were imported.  Cannot proceed with menu import.');
    }
    
    await importMenuItems(codeToIdMap);
    
    console.log('\n✅ Import completed successfully!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

main();