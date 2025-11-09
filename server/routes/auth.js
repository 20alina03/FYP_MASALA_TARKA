const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');
const UserRole = require('../models/UserRole');

const router = express.Router();

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = new User({ email, password, full_name });
    await user.save();

    // Create profile
    const profile = new Profile({
      user_id: user._id,
      email: user.email,
      full_name: user.full_name
    });
    await profile.save();

    // Create user role
    const userRole = new UserRole({
      user_id: user._id,
      role: 'user'
    });
    await userRole.save();

    // Create token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sign in
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name
      },
      token
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user session
router.get('/session', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Sign out
router.post('/signout', (req, res) => {
  res.json({ message: 'Signed out successfully' });
});

module.exports = router;
