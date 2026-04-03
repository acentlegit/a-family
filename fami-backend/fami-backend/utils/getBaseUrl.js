const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';

/**
 * Returns the absolute base URL to use when generating public links
 * for uploaded assets (avatars, covers, etc.).
 *
 * Preference order:
 * 1) PUBLIC_BASE_URL env (e.g., https://api.fami.live)
 * 2) NODE_ENV=production → https://api.fami.live
 * 3) Fallback to local dev URL
 */
module.exports = function getBaseUrl() {
	// Allow overriding explicitly from environment
	const fromEnv = (process.env.PUBLIC_BASE_URL || '').trim();
	if (fromEnv) return fromEnv.replace(/\/+$/, '');

	// Default by environment
	if (isProduction) return 'https://api.fami.live';
	return 'http://localhost:5000';
};

const getBaseUrl = () => {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  const { BASE_URL } = require("../config/env");
  return BASE_URL;
};

module.exports = getBaseUrl;
