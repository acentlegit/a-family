const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const rateLimit = require('express-rate-limit');

// Use a safe default JWT secret in development if none is provided.
// This avoids runtime errors when JWT_SECRET is not set locally.
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

// Rate limiting for auth endpoints
exports.authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { 
    success: false, 
    message: 'Too many authentication attempts, please try again later' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
exports.apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { 
    success: false, 
    message: 'Too many requests, please try again later' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper to get client IP
const getClientIp = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
         'unknown';
};

// Audit log middleware for admin actions
exports.auditLog = (action, targetType = 'Other') => {
  return async (req, res, next) => {
    // Only log admin actions
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
      try {
        await AuditLog.create({
          user: req.user._id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action,
          method: req.method,
          endpoint: req.originalUrl,
          targetType,
          targetId: req.params.id || req.body.id || null,
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || 'unknown',
          status: 'SUCCESS'
        });
      } catch (error) {
        console.error('Error creating audit log:', error);
        // Don't fail the request if audit logging fails
      }
    }
    next();
  };
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password -refreshToken');
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    // Set user role for authorization checks
    req.userRole = req.user.role;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please refresh your token.' 
      });
    }
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `User role ${req.user.role} is not authorized to access this route` 
      });
    }
    next();
  };
};

// Middleware to filter by family (security best practice)
exports.filterByFamily = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Super admins can access all families
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Admins can access all families
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Regular users must have activeFamilyId set
    if (req.user.activeFamilyId) {
      // Ensure user is a member of the active family
      const Family = require('../models/Family');
      const family = await Family.findById(req.user.activeFamilyId);
      
      if (family && family.members.some(m => m.user.toString() === req.user._id.toString())) {
        req.familyId = req.user.activeFamilyId;
        return next();
      }
    }

    // If no active family, try to use familyId from params or body
    const familyId = req.params.familyId || req.body.familyId || req.query.familyId;
    if (familyId) {
      const Family = require('../models/Family');
      const family = await Family.findById(familyId);
      
      if (family && family.members.some(m => m.user.toString() === req.user._id.toString())) {
        req.familyId = familyId;
        return next();
      }
    }

    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. You must be a member of this family.' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking family access' 
    });
  }
};
