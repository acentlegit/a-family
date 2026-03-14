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

  if (process.env.NODE_ENV === "production") {
    // Production requires CLIENT_URL environment variable
    console.error("❌ CLIENT_URL environment variable is required in production!");
    throw new Error("CLIENT_URL environment variable is required in production");
  }

  // Development fallback - only for local development
  console.warn("⚠️  Using default localhost client URL for development");
  return "http://localhost:3000";
};

module.exports = getClientUrl;


