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
  
  // No fallback - environment variable must be set
  throw new Error('REACT_APP_API_BASE environment variable is not set. Please configure it in .env file.');
};

// Get API URL
export const getApiUrl = (): string => {
  return getApiBase();
};

// Export for components that need direct URL access
export const API_URL = getApiUrl();

// Create axios instance with timeout and credentials
const api = axios.create({
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
    console.log('🔍 API Request:', config.method?.toUpperCase(), fullUrl);
    if (config.data instanceof FormData) {
      console.log('🔍 FormData detected - Content-Type will be set automatically');
    }
    
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
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
    // Log response details safely
    try {
      console.log('✅ Response headers:', {
        'content-type': response.headers['content-type'] || 'not set',
        'content-length': response.headers['content-length'] || 'not set'
      });
      console.log('✅ Response data type:', typeof response.data);
      
      // Safely get response data keys
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Response data keys:', Object.keys(response.data));
      } else if (response.data === null || response.data === undefined) {
        console.log('✅ Response data: null or undefined');
      } else {
        console.log('✅ Response data:', typeof response.data);
      }
    } catch (logError) {
      console.warn('⚠️  Error logging response details:', logError);
    }
    
    // Ensure response data is properly parsed (axios should handle this automatically)
    // But double-check to ensure it's an object, not a string
    if (typeof response.data === 'string' && response.data.trim()) {
      try {
        const parsed = JSON.parse(response.data);
        response.data = parsed;
        console.log('✅ Parsed JSON response data from string');
      } catch (e) {
        console.warn('⚠️  Response data is string but not valid JSON:', response.data.substring(0, 100));
        // Keep original string data if parsing fails - don't break the response
      }
    }
    
    // Verify response.data is an object (not null, not undefined, not primitive)
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      console.log('✅ Response data is valid object');
    } else if (response.data === null) {
      console.warn('⚠️  Response data is null');
    } else if (response.data === undefined) {
      console.warn('⚠️  Response data is undefined');
    } else {
      console.log('✅ Response data type:', typeof response.data, Array.isArray(response.data) ? '(array)' : '');
    }
    
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', error.config?.method?.toUpperCase(), error.config?.url);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error response data:', error.response?.data);
    
    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      console.error('❌ Network error - backend may not be running');
      return Promise.reject(new Error('Unable to connect to server. Please check if the backend is running.'));
    }
    
    // Auto-logout on 401, but only if not already on login page
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const errorMessage = error.response?.data?.message || '';
      
      console.log('❌ 401 Unauthorized:', errorMessage);
      console.log('❌ Current path:', currentPath);
      
      // If token expired, try to refresh or redirect to login
      if (errorMessage.includes('expired') || errorMessage.includes('Invalid token')) {
        console.log('⚠️  Token expired or invalid - user needs to login again');
        // Clear tokens and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (currentPath !== '/login') {
          window.location.href = '/login';
        }
      } else if (currentPath !== '/login' && !currentPath.includes('/super-admin')) {
        console.log('❌ 401 Unauthorized - clearing auth and redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (currentPath !== '/login') {
          window.location.href = '/login';
        }
      } else {
        console.log('⚠️  401 on protected route, but already on login or super-admin page');
        console.log('⚠️  Error message:', errorMessage);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
