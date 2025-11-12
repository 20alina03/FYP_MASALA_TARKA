const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      full_name: decoded.full_name
    };
    
    console.log('User authenticated:', req.user.email);
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Export both ways for compatibility
module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;