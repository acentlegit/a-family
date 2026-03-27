const getBaseUrl = () => {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  const { BASE_URL } = require("../config/env");
  return BASE_URL;
};

module.exports = getBaseUrl;
