const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/recipe-finder';

// Define Schemas
const menuItemSchema = new mongoose.Schema({}, { strict: false });
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// ENHANCED categorization with better patterns
function enhancedCategorize(name, description) {
  const text = `${name} ${description || ''}`.toLowerCase();

  // Pizza variations
  if (text.match(/pizza|flatbread/i)) 
    return 'Pizza';

  // Burgers & Sandwiches (enhanced)
  if (text.match(/burger|sandwich|wrap|sub\b|club\b|bun\b|slider|panini|roll\b/i)) 
    return 'Burgers & Sandwiches';

  // Rice & Biryani (enhanced)
  if (text.match(/biryani|pulao|pilaf|rice|fried rice|steamed rice|risotto/i)) 
    return 'Rice & Biryani';

  // Noodles & Pasta (enhanced)
  if (text.match(/pasta|noodles|spaghetti|macaroni|chow mein|lo mein|ramen|udon|penne|fettuccine|linguine/i)) 
    return 'Noodles & Pasta';

  // Main Course (enhanced)
  if (text.match(/karahi|curry|nihari|haleem|korma|qorma|masala|vindaloo|stew|roast|platter|gravy|chicken\s+(?!wing|nugget|strip|tender|fries)|beef\s+|lamb\s+|mutton\s+|fish\s+fillet|steak/i)) 
    return 'Main Course';

  // BBQ & Grills (enhanced)
  if (text.match(/bbq|grill|grilled|kebab|tikka|boti|seekh|tandoor|sajji|chargha|charcoal|smoked|skewer/i)) 
    return 'BBQ & Grills';

  // Sushi & Rolls (enhanced)
  if (text.match(/sushi|roll(?!.*bread)|maki|california|sashimi|nigiri|tempura|dynamite|teriyaki/i)) 
    return 'Sushi & Rolls';

  // Starters & Appetizers (enhanced)
  if (text.match(/starter|appetizer|spring roll|samosa|pakora|wing|nugget|tender|strip|popcorn chicken|finger|fritter|cutlet|croquette|bruschetta|taco|nacho/i)) 
    return 'Starters & Appetizers';

  // Soups
  if (text.match(/soup|broth|consomme/i)) 
    return 'Soups';

  // Salads
  if (text.match(/salad|coleslaw|slaw/i)) 
    return 'Salads';

  // Desserts & Sweets (enhanced)
  if (text.match(/dessert|cake|ice cream|sweet|kheer|gulab jamun|brownie|pudding|custard|mousse|pastry|donut|cookie|waffle|pancake|crepe|pie|tart|cheesecake|tiramisu|eclair|macaron|truffle|fudge|caramel|chocolate(?!.*sauce)|sundae|parfait/i)) 
    return 'Desserts & Sweets';

  // Shakes & Smoothies (enhanced)
  if (text.match(/shake|smoothie|milkshake|frappe|blended|frappuccino/i)) 
    return 'Shakes & Smoothies';

  // Coffee & Tea (enhanced)
  if (text.match(/coffee|cappuccino|latte|espresso|mocha|americano|macchiato|cortado|tea|chai|green tea|iced tea|matcha/i)) 
    return 'Coffee & Tea';

  // Beverages & Drinks (enhanced)
  if (text.match(/juice|soda|coke|pepsi|sprite|fanta|7up|mountain dew|miranda|water|drink|beverage|cola|lemonade|iced|mojito|slush|cooler|refresher|fizz/i)) 
    return 'Beverages & Drinks';

  // Sides (enhanced)
  if (text.match(/fries|wedge|potato|side|raita|chutney|coleslaw|dip|sauce(?!.*main)|mayo|ketchup|garlic bread|bread\b|bun\b(?!.*burger)|rice\s+(?!biryani|pulao)|mash/i)) 
    return 'Sides';

  // Special Deals (enhanced)
  if (text.match(/deal|combo|platter|family|special|bucket|meal|box|value|offer|package|feast|bundle/i)) 
    return 'Special Deals';

  // Breakfast (enhanced)
  if (text.match(/breakfast|paratha|omelette|omelet|halwa puri|puri|chanay|nashta|egg|scrambled|fried egg|toast|bagel|croissant|muffin|cereal/i)) 
    return 'Breakfast';

  // Combos & Platters
  if (text.match(/combo|platter|assorted|mixed|variety|selection/i)) 
    return 'Combos & Platters';

  return 'Other';
}

// Main recategorization function
async function recategorizeOtherItems() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all "Other" items
    const otherItems = await MenuItem.find({ category: 'Other' }).lean();
    console.log(`📊 Found ${otherItems.length} items in "Other" category\n`);

    if (otherItems.length === 0) {
      console.log('✅ No "Other" items to recategorize!');
      return;
    }

    console.log('🔄 Recategorizing with enhanced patterns...\n');

    let updated = 0;
    const categoryChanges = {};

    for (const item of otherItems) {
      const newCategory = enhancedCategorize(item.name, item.description);
      
      if (newCategory !== 'Other') {
        await MenuItem.updateOne(
          { _id: item._id },
          { 
            $set: { 
              category: newCategory,
              updated_at: new Date()
            }
          }
        );
        
        categoryChanges[newCategory] = (categoryChanges[newCategory] || 0) + 1;
        updated++;
      }
    }

    console.log(`✅ Recategorized ${updated} items out of ${otherItems.length}\n`);
    console.log('📊 Changes by category:\n');
    
    Object.entries(categoryChanges)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`   ${category}: +${count} items`);
      });

    // Show remaining "Other" items
    const remainingOther = await MenuItem.countDocuments({ category: 'Other' });
    console.log(`\n⚠️  Remaining "Other" items: ${remainingOther}`);

    // Show updated distribution
    console.log('\n📊 Updated Overall Distribution:\n');
    const distribution = await MenuItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    distribution.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count} items`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
console.log('🚀 Starting Recategorization of "Other" Items...\n');
recategorizeOtherItems().then(() => {
  console.log('\n✨ Recategorization complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});