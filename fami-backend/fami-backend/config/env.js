const warnedKeys = new Set();

const isProduction = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 5000;

const warnOnce = (key, message) => {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.error(message);
};

const getRequiredOrFallback = (key, fallback, message) => {
  const value = process.env[key];
  if (value) return value;

  if (isProduction) {
    warnOnce(key, message);
  }

  return fallback;
};

const JWT_SECRET = getRequiredOrFallback(
  "JWT_SECRET",
  "dev_jwt_secret_change_me",
  "❌ JWT_SECRET environment variable is required in production."
);

const BASE_URL = getRequiredOrFallback(
  "BASE_URL",
  `http://localhost:${PORT}`,
  `❌ BASE_URL environment variable is required in production. Using fallback: http://localhost:${PORT}`
);

const CLIENT_URL = getRequiredOrFallback(
  "CLIENT_URL",
  "http://localhost:3000",
  "❌ CLIENT_URL environment variable is required in production. Using localhost fallback."
);

const MONGODB_URI = getRequiredOrFallback(
  "MONGODB_URI",
  "mongodb://localhost:27017/fami",
  "❌ MONGODB_URI environment variable is required in production. Using development fallback URI."
);

// Support email for admin approvals and notifications
const SUPPORT_EMAIL = getRequiredOrFallback(
  "SUPPORT_EMAIL",
  "support@acentle.ai",
  "⚠️ SUPPORT_EMAIL not set; defaulting to support@acentle.ai"
);

module.exports = {
  isProduction,
  PORT,
  JWT_SECRET,
  BASE_URL,
  CLIENT_URL,
  MONGODB_URI,
  SUPPORT_EMAIL,
};
