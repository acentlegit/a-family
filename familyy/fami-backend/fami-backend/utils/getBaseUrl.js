


const getBaseUrl = () => {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    // Use production API domain
    return "https://api.fami.live";
  }

  // Development fallback - only for local development
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:5000";
  }

  // Production requires BASE_URL
  console.error("❌ BASE_URL environment variable is required in production!");
  return "https://api.fami.live";
};

module.exports = getBaseUrl;
