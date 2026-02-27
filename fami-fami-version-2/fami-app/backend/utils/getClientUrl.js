/**
 * Get the client (frontend) URL
 * This ensures consistent frontend URL generation across all routes
 * 
 * In production, CLIENT_URL should always be set in .env
 * If not set, it will use the S3 URL as fallback
 */
function getClientUrl() {
  // Priority 1: Explicit CLIENT_URL from environment
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Priority 2: FRONTEND_URL (alternative name)
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  
  // Priority 3: Production - use arakala.net
  if (process.env.NODE_ENV === 'production') {
    return 'https://www.arakala.net';
  }
  
  // Priority 4: Development - require CLIENT_URL to be set
  // Don't use localhost as it breaks in production
  console.warn('⚠️  CLIENT_URL not set. Please set CLIENT_URL in .env file.');
  console.warn('⚠️  For production, set: CLIENT_URL=https://www.arakala.net');
  console.warn('⚠️  For development, set: CLIENT_URL=http://107.20.87.206:3000');
  
  // Return arakala.net as safe fallback (better than localhost)
  return 'https://www.arakala.net';
}

module.exports = getClientUrl;
