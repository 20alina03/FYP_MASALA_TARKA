const mongoose = require('mongoose');
require('dotenv').config();

async function testDB() {
  try {
    await mongoose.connect(process.env. MONGODB_URI || 'mongodb://localhost:27017/recipe-finder');
    console.log('✅ Connected');
    
    const restaurants = await mongoose.connection.db. collection('restaurants').find({}).limit(5).toArray();
    
    console.log(`\n📊 Found ${restaurants.length} restaurants:\n`);
    restaurants.forEach(r => {
      console.log(`- ${r.name} (${r.latitude}, ${r.longitude})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDB();