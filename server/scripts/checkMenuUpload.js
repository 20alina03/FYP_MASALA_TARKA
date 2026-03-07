const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const Restaurant = require('../models/Restaurant');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/recipe-finder');

  const menuItemCount = await MenuItem.countDocuments();
  const categoryCount = await MenuCategory.countDocuments();
  const restaurantsWithMenuCount = await Restaurant.countDocuments({ has_menu: true });

  console.log({ menuItemCount, categoryCount, restaurantsWithMenuCount });

  const sample = await MenuItem.find().limit(5).lean();
  console.log('Sample menu items:', sample);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});