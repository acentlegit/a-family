const rateLimit = require('express-rate-limit');

// Rate limiter for auth routes - Increased for production use
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes (increased for many users)
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true
});

// Rate limiter for password reset - Increased for production use
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour (increased for many users)
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for general API routes
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute (very generous for authenticated users)
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for authenticated requests (they have tokens)
  skip: (req) => {
    // If user has valid auth token, skip rate limiting
    return req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
  }
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  apiLimiter
};
