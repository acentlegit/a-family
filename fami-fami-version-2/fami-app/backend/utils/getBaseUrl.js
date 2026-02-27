/**
 * Get the base URL for serving uploaded files
 * This ensures consistent URL generation across all routes
 */
function getBaseUrl() {
  // Priority 1: Explicit BASE_URL or API_URL from environment
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  
  if (process.env.API_URL) {
    // Remove /api if present, we just want the base URL
    return process.env.API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  
  // Priority 2: Check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    // Production: Use HTTPS API domain (not HTTP IP)
    // This prevents mixed content errors when frontend is served over HTTPS
    return 'https://api.arakala.net';
  }
  
  // Priority 3: Development - use localhost
  if (process.env.NODE_ENV !== 'production') {
    // Development: Use localhost for local development
    const port = process.env.PORT || 5000;
    return `http://localhost:${port}`;
  }
  
  // Production fallback - use HTTPS API domain
  console.warn('⚠️  BASE_URL or API_URL not set. Using production HTTPS URL as fallback.');
  return 'https://api.arakala.net';
}

module.exports = getBaseUrl;
