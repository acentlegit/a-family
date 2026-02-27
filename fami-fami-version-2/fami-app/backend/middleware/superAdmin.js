const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Use the same JWT_SECRET as auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const superAdminAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header (supports both formats)
    let token = req.headers.authorization || req.header('Authorization');
    
    console.log('🔍 Super Admin Auth - Authorization header:', req.headers.authorization ? 'present' : 'missing');
    
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    
    if (!token) {
      console.log('❌ Super Admin Auth - No token provided');
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    console.log('🔍 Super Admin Auth - Verifying token with JWT_SECRET:', !!JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Super Admin Auth - Token decoded, user ID:', decoded.id);
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('❌ Super Admin Auth - User not found for ID:', decoded.id);
      return res.status(401).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    console.log('🔍 Super Admin Auth - User found:', user.email, 'Role:', user.role, 'isSuperAdmin:', user.isSuperAdmin);

    // Use new role field (fallback to isSuperAdmin for backward compatibility)
    if (user.role !== 'SUPER_ADMIN' && !user.isSuperAdmin) {
      console.log('❌ Super Admin Auth - User does not have super admin privileges');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Super admin privileges required.' 
      });
    }

    console.log('✅ Super Admin Auth - Access granted for:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Super admin auth error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Token received:', token ? `${token.substring(0, 20)}...` : 'none');
    console.error('❌ JWT_SECRET set:', !!process.env.JWT_SECRET);
    
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
