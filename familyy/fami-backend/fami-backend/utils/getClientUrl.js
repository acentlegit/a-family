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
    // Use production frontend domain
    return "https://fami.live";
  }

  // Development fallback - only for local development
  if (process.env.NODE_ENV !== "production") {
    console.warn("⚠️  Using default localhost client URL for development");
    return "http://localhost:3000";
  }

  // Production requires CLIENT_URL
  console.warn("⚠️  CLIENT_URL not set, using production default");
  return "https://fami.live";
};

module.exports = getClientUrl;


