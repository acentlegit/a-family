import React, { createContext, useContext, useState, ReactNode } from 'react';
import api from '../config/api';
import { copySessionHomepageCacheToGuestStorage } from '../constants/homepageStorage';

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

const readStoredToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

const readStoredUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Attempting login
      
      // Make request with explicit withCredentials (already set globally, but being explicit)
      const response = await api.post('/auth/login', { email, password }, {
        withCredentials: true
      });
      
      // Login API response received
      
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
        
        // Only validate if we have the essential data
        if (!token) {
          throw new Error('Invalid login response: missing token');
        }
        
        if (!user) {
          throw new Error('Invalid login response: missing user data');
        }

        // Save to localStorage first (safely)
        try {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        } catch (storageError) {
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
    // Keep homepage look on this device after logout (guest view uses localStorage)
    copySessionHomepageCacheToGuestStorage();

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
