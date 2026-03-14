


const getBaseUrl = () => {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    // Production requires BASE_URL environment variable
    console.error("❌ BASE_URL environment variable is required in production!");
    throw new Error("BASE_URL environment variable is required in production");
  }

  // Development fallback - only for local development
  return "http://localhost:5000";
};

module.exports = getBaseUrl;
