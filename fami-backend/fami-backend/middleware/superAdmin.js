const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');

const JWT_SECRET_FINAL = JWT_SECRET;

const superAdminAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header (supports both formats)
    let token = req.headers.authorization || req.header('Authorization');
    
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET_FINAL);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    // Use new role field (fallback to isSuperAdmin for backward compatibility)
    if (user.role !== 'SUPER_ADMIN' && !user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Super admin privileges required.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Super admin auth error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format: ' + error.message 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token: ' + error.message 
    });
  }
};

module.exports = superAdminAuth;
