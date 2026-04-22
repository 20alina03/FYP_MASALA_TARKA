const fs = require('fs');
const path = require('path');

let backupData = null;

const loadBackupData = () => {
  try {
    const backupPath = path.join(__dirname, '../backup.json');
    if (fs.existsSync(backupPath)) {
      backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      console.log('✅ Loaded backup data from backup.json');
      return backupData;
    }
  } catch (err) {
    console.error('Error loading backup:', err.message);
  }
  return null;
};

const getBackupData = (collection) => {
  if (!backupData) {
    backupData = loadBackupData();
  }
  return backupData?.[collection] || [];
};

module.exports = {
  loadBackupData,
  getBackupData
};
