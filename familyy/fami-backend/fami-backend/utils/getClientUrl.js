/**
 * Get the client (frontend) URL
 * This ensures consistent frontend URL generation across all routes
 * 
 * In production, CLIENT_URL should always be set in .env
 * If not set, it will use the S3 URL as fallback
 */
const getClientUrl = () => {
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL;
  }

  if (process.env.S3_BUCKET_URL) {
    return process.env.S3_BUCKET_URL;
  }

  const { CLIENT_URL } = require("../config/env");
  return CLIENT_URL;
};

module.exports = getClientUrl;


