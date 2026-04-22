const mongoose = require('mongoose');
const fs = require('fs');

async function exportData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/recipe-finder');
    
    const collections = mongoose.connection.collections;
    const backup = {};
    
    for (const name in collections) {
      backup[name] = await collections[name].find({}).toArray();
    }
    
    fs.writeFileSync('backup.json', JSON.stringify(backup, null, 2));
    console.log('✅ Backup created: backup.json');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

exportData();
