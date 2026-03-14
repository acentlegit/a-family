import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../config/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  hobbies?: string;
  occupation?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  // Deprecated: Use role instead
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; token: string; user: User }>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: (user: User | null) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('🔍 AuthContext - Attempting login for:', email);
      console.log('🔍 AuthContext - API Base:', process.env.REACT_APP_API_BASE || 'Not configured');
      
      // Make request with explicit withCredentials (already set globally, but being explicit)
      const response = await api.post('/auth/login', { email, password }, {
        withCredentials: true
      });
      
      console.log('✅ AuthContext - Login API response received:', response.data);
      console.log('✅ AuthContext - Response status:', response.status);
      
      // Safely stringify response for logging
      try {
        console.log('✅ AuthContext - Full response:', JSON.stringify(response.data, null, 2));
      } catch (e) {
        console.log('✅ AuthContext - Full response (could not stringify):', response.data);
      }
      
      // Check actual backend response structure and status
      if (response.status === 200 || response.status === 201) {
        // Handle multiple response formats - check ALL possible locations:
        // 1. { token, user }
        // 2. { success: true, token, user }
        // 3. { data: { token, user } }
        // 4. { success: true, data: { token, user } }
        // 5. { result: { token, user } }
        // 6. Any other nested structure
        
        let token: string | undefined;
        let user: any;
        
        // First, try top-level
        token = response.data.token;
        user = response.data.user;
        
        // If not found, check nested data structure
        if ((!token || !user) && response.data.data) {
          token = response.data.data.token || token;
          user = response.data.data.user || user;
        }
        
        // If still not found, check result structure
        if ((!token || !user) && response.data.result) {
          token = response.data.result.token || token;
          user = response.data.result.user || user;
        }
        
        // If still not found, check if data itself is the token/user object
        if ((!token || !user) && response.data.data && typeof response.data.data === 'object') {
          // Check if data has token/user directly
          if (!token && response.data.data.token) token = response.data.data.token;
          if (!user && response.data.data.user) user = response.data.data.user;
        }
        
        // Log what we found (safely)
        console.log('🔍 AuthContext - Extracted token:', token ? 'Found' : 'Missing');
        console.log('🔍 AuthContext - Extracted user:', user ? 'Found' : 'Missing');
        
        // Safely log response keys
        try {
          if (response.data && typeof response.data === 'object') {
            console.log('🔍 AuthContext - Response keys:', Object.keys(response.data));
          }
        } catch (e) {
          console.warn('⚠️  Could not log response keys');
        }

        // Only validate if we have the essential data
        if (!token) {
          console.error('❌ AuthContext - Token missing in response:', response.data);
          throw new Error('Invalid login response: missing token');
        }
        
        if (!user) {
          console.error('❌ AuthContext - User missing in response:', response.data);
          throw new Error('Invalid login response: missing user data');
        }

        console.log('🔍 AuthContext - User object:', user);
        console.log('🔍 AuthContext - User role:', user.role);
        console.log('🔍 AuthContext - isSuperAdmin:', user.isSuperAdmin);

        // Save to localStorage first (safely)
        try {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        } catch (storageError) {
          console.error('❌ AuthContext - Error saving to localStorage:', storageError);
          throw new Error('Failed to save authentication data');
        }

        // Update state synchronously
        setToken(token);
        setUser(user);
        
        // Ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 50));
        
        setLoading(false);
        return { success: true, token, user };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error: any) {
      setLoading(false);
      
      // Safe error logging
      try {
        console.error('❌ AuthContext - Login error:', error);
        console.error('❌ AuthContext - Error message:', error?.message || 'Unknown error');
        
        if (error?.response) {
          console.error('❌ AuthContext - Error status:', error.response.status);
          console.error('❌ AuthContext - Error response data:', error.response.data);
        } else {
          console.error('❌ AuthContext - No response object (network error)');
        }
        
        if (error?.code) {
          console.error('❌ AuthContext - Error code:', error.code);
        }
      } catch (logError) {
        console.error('❌ AuthContext - Error logging failed:', logError);
      }
      
      // Re-throw so Login component can handle it
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post('/auth/register', data, {
        withCredentials: true
      });

      console.log('✅ Register success:', response.data);
      console.log('✅ Register status:', response.status);

      // Check actual backend response structure
      if (response.status === 200 || response.status === 201) {
        // Handle multiple response formats
        let token = response.data.token;
        let user = response.data.user;
        
        // Check nested data structure
        if (!token && response.data.data) {
          token = response.data.data.token;
          user = response.data.data.user;
        }

        if (!token) {
          throw new Error('Invalid registration response: missing token');
        }
        
        if (!user) {
          throw new Error('Invalid registration response: missing user data');
        }

        // Save to localStorage safely
        try {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        } catch (storageError) {
          console.error('❌ Register - Error saving to localStorage:', storageError);
          throw new Error('Failed to save registration data');
        }

        setToken(token);
        setUser(user);
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error: any) {
      // Safe error logging
      try {
        console.error('❌ Register error:', error);
        console.error('❌ Register error message:', error?.message || 'Unknown error');
        
        if (error?.response) {
          console.error('❌ Register error status:', error.response.status);
          console.error('❌ Register error response:', error.response.data);
        }
      } catch (logError) {
        console.error('❌ Error logging failed:', logError);
      }
      throw error;
    }
  };

  const logout = () => {
    // Clear localStorage immediately
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    
    // Clear state immediately
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
