const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/mongodb');
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const recipeRoutes = require('./routes/recipes');
const restaurantRoutes = require('./routes/restaurants');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api', recipeRoutes);
app.use('/api/restaurants', restaurantRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running with MongoDB' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/recipe-finder'}`);
  console.log('✅ Available routes:');
  console.log('  - /api/auth/* - Authentication');
  console.log('  - /api/recipes - Recipe management');
  console.log('  - /api/restaurants - Restaurant API');
  console.log('  - /api/health - Health check');
});

module.exports = app;