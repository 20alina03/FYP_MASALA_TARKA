const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function exportData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/recipe-finder');
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const backup = {};
    
    for (const col of collections) {
      const collectionName = col.name;
      const data = await db.collection(collectionName).find({}).toArray();
      backup[collectionName] = data;
      console.log(`📦 Exported ${collectionName}: ${data.length} items`);
    }
    
    fs.writeFileSync(path.join(__dirname, 'backup.json'), JSON.stringify(backup, null, 2));
    console.log('✅ Backup created: backup.json');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

exportData();
