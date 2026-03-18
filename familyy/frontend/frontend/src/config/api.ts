import axios from 'axios';

/**
 * Clean API Configuration
 * 
 * GOLDEN RULE: Frontend NEVER hardcodes backend URLs
 * It ONLY uses REACT_APP_API_BASE environment variable
 */

// Get API Base URL from environment variable
const getApiBase = (): string => {
  // Use REACT_APP_API_BASE from .env file (build-time)
  const apiBase = process.env.REACT_APP_API_BASE;
  
  if (apiBase) {
    // Ensure it ends with /api
    return apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
  }
  
  // No hardcoded fallback for production - environment variable is required
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ REACT_APP_API_BASE environment variable is required in production!');
    return '';
  }
  
  // Development fallback only (silent - no console warnings)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // Return empty string to fail gracefully - will cause API calls to fail with clear error
  return '';
};

// Get API URL
export const getApiUrl = (): string => {
  return getApiBase();
};

// Export for components that need direct URL access
export const API_URL = getApiUrl();

const api = axios.create({
  baseURL: getApiBase(), // Uses REACT_APP_API_BASE from environment
  timeout: 30000, // 30 second timeout
  withCredentials: true, // Send cookies and credentials with requests (required for CORS with credentials)
  // Don't set default Content-Type - let it be set per request (needed for FormData)
});

// Set baseURL on each request (allows runtime config changes)
api.interceptors.request.use(
  (config) => {
    const apiUrl = getApiUrl();
    config.baseURL = apiUrl;
    
    // Ensure URL starts with / if it doesn't already (but preserve baseURL structure)
    if (config.url) {
      // If URL doesn't start with / or http, add /
      if (!config.url.startsWith('/') && !config.url.startsWith('http')) {
        config.url = '/' + config.url;
      }
      // Remove double slashes (except after http:// or https://)
      config.url = config.url.replace(/([^:]\/)\/+/g, '$1');
    }
    
    // Ensure baseURL doesn't end with / and url starts with /
    if (config.baseURL && config.baseURL.endsWith('/') && config.url && config.url.startsWith('/')) {
      config.baseURL = config.baseURL.slice(0, -1);
    }
    
    // Ensure baseURL doesn't end with / (to avoid double slashes)
    if (config.baseURL && config.baseURL.endsWith('/')) {
      config.baseURL = config.baseURL.slice(0, -1);
    }
    
    const fullUrl = (config.baseURL || '') + (config.url || '');
    // API request being made
    
    // Ensure credentials are sent (required for CORS with credentials)
    config.withCredentials = true;
    
    // Add auth token if available (JWT in Authorization header)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Set Content-Type header - REQUIRED for CORS with credentials
    // FormData sets its own Content-Type with boundary automatically
    if (!(config.data instanceof FormData)) {
      // Always set Content-Type for JSON requests
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    }
    
    // Ensure headers are properly set (no wildcard allowed with credentials)
    // Backend must send specific origin, not "*"
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    // Ensure response data is properly parsed (axios should handle this automatically)
    // But double-check to ensure it's an object, not a string
    if (typeof response.data === 'string' && response.data.trim()) {
      try {
        const parsed = JSON.parse(response.data);
        response.data = parsed;
      } catch (e) {
        // Keep original string data if parsing fails - don't break the response
      }
    }
    
    return response;
  },
  async (error) => {
    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      return Promise.reject(new Error('Unable to connect to server. Please check if the backend is running.'));
    }
    
    // Handle 401 errors - don't auto-redirect on login page
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const errorMessage = error.response?.data?.message || '';
      
      // Only clear tokens and redirect if NOT on login/register pages
      // This prevents redirect loops and allows login errors to display
      if (currentPath !== '/login' && currentPath !== '/register' && !currentPath.includes('/super-admin')) {
        // If token expired or invalid, clear and redirect
        if (errorMessage.includes('expired') || errorMessage.includes('Invalid token') || errorMessage.includes('Not authorized')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
      // If on login page, let the error display (don't redirect)
    }
    return Promise.reject(error);
  }
);

export default api;
