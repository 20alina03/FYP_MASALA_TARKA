const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/mongodb');
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const recipeRoutes = require('./routes/recipes');
const restaurantRoutes = require('./routes/restaurants');

dotenv.config();

const app = express();

// Detect if running on Railway
const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME !== undefined;
console.log(`🌐 Environment: ${isRailway ? 'RAILWAY' : 'LOCAL'}`);

// Load backup data ONLY on Railway
let backupData = null;
if (isRailway) {
  try {
    const backupPath = path.join(__dirname, 'backup.json');
    if (fs.existsSync(backupPath)) {
      backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      console.log('✅ Backup data loaded for Railway');
    }
  } catch (err) {
    console.warn('⚠️ Could not load backup.json:', err.message);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Store backup data in app context
app.locals.backupData = backupData;
app.locals.isRailway = isRailway;

// Connect to MongoDB (non-blocking)
let mongoConnected = false;
connectDB().then(conn => {
  if (conn) {
    mongoConnected = true;
    app.locals.mongoConnected = true;
    console.log('✅ MongoDB connected');
  } else {
    console.warn('⚠️ MongoDB not available');
    app.locals.mongoConnected = false;
  }
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  app.locals.mongoConnected = false;
});

// Backup data API endpoint (ONLY on Railway when MongoDB is down)
app.get('/api/backup/:collection', (req, res) => {
  if (!isRailway) {
    return res.status(403).json({ error: 'Backup API only available on Railway' });
  }
  
  if (!app.locals.backupData) {
    return res.status(503).json({ error: 'No backup data available' });
  }
  
  const collectionName = req.params.collection;
  const data = app.locals.backupData[collectionName] || [];
  
  console.log(`📦 Serving ${data.length} items from backup.${collectionName}`);
  res.json(data);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api', recipeRoutes);
app.use('/api/restaurants', restaurantRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    environment: isRailway ? 'Railway' : 'Local',
    mongoConnected: app.locals.mongoConnected,
    backupAvailable: !!app.locals.backupData
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  console.log('  - /api/auth/* - Authentication');
  console.log('  - /api/recipes - Recipe management');
  console.log('  - /api/restaurants - Restaurant API');
  if (isRailway) {
    console.log('  - /api/backup/:collection - Backup data (Railway only)');
  }
  console.log('  - /api/health - Health check');
});

module.exports = app;
