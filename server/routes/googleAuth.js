const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth login/signup
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    console.log('Google OAuth request received');
    
    // Verify the Google credential
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;
    
    console.log('Google user verified:', email);
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user with Google info
      user = new User({
        email,
        full_name: name,
        password: `google_${googleId}_${Date.now()}`, // Random password for Google users
        google_id: googleId,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      await user.save();
      console.log('New Google user created:', user._id);
    } else if (!user.google_id) {
      // Link Google account to existing user
      user.google_id = googleId;
      user.updated_at = new Date();
      await user.save();
      console.log('Google account linked to existing user:', user._id);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id.toString(), 
        email: user.email,
        full_name: user.full_name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name
      },
      token
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: error.message || 'Google authentication failed' });
  }
});

module.exports = router;