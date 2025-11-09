const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/recipe-finder', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize collections if they don't exist
    const db = conn.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    const requiredCollections = [
      'users',
      'profiles', 
      'recipes',
      'generated_recipes',
      'recipe_books',
      'recipe_likes',
      'recipe_comments',
      'restaurants',
      'user_roles'
    ];
    
    for (const collectionName of requiredCollections) {
      if (!collectionNames.includes(collectionName)) {
        await db.createCollection(collectionName);
        console.log(`Created collection: ${collectionName}`);
      }
    }
    
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
