const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recipe-finder';
    console.log('Attempting to connect to MongoDB at:', mongoUri.replace(/mongodb\+srv:\/\/.*:.*@/, 'mongodb+srv://***:***@'));
    
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
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
    console.error(`MongoDB Error: ${error.message}`);
    console.warn('Server starting without MongoDB connection.');
    return null;
  }
};

module.exports = connectDB;
