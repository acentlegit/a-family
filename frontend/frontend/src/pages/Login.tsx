import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';
import { getApiUrl } from '../config/api';

const Login: React.FC = () => {
  const HOMEPAGE_CUSTOMIZE_AFTER_LOGIN_KEY = 'homepage_customize_after_login';
  // Default user credentials (read from env only) - for checking only, not for pre-filling
  const DEFAULT_USER_EMAIL = process.env.REACT_APP_DEFAULT_USER_EMAIL || '';
  const DEFAULT_USER_PASSWORD = process.env.REACT_APP_DEFAULT_USER_PASSWORD || '';
  const normalizeEnv = (val?: string) => {
    if (!val) return '';
    let v = String(val).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).trim();
    }
    return v;
  };
  // Arakala single-user override (username fixed, password from .env)
  const ARAKALA_SINGLE_USER_ID =
    normalizeEnv(process.env.REACT_APP_KHAMMAM_USER_ID) ||
    normalizeEnv(localStorage.getItem('KHAMMAM_USER_ID') || '') ||
    'Khammam$1926';
  const ARAKALA_SINGLE_USER_PASSWORD =
    normalizeEnv(process.env.REACT_APP_KHAMMAM_PASSWORD) ||
    normalizeEnv(process.env.REACT_APP_ARAKALA_PASSWORD) ||
    normalizeEnv(DEFAULT_USER_PASSWORD) ||
    normalizeEnv(localStorage.getItem('KHAMMAM_PASSWORD') || '') ||
    '';

  // Dev aid: log whether envs are seen (never log the actual password)
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[Arakala Login] Using special ID:', ARAKALA_SINGLE_USER_ID, 'Password set:', Boolean(ARAKALA_SINGLE_USER_PASSWORD));
  }
  
  // Allow multiple accepted IDs to avoid 401 when env/localStorage differs
  const SPECIAL_USER_IDS = new Set<string>([
    ARAKALA_SINGLE_USER_ID.toLowerCase(),
    'khammam',
    'khammam$1926',
  ]);

  // Keep input boxes empty - user must type credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDefaultUser, setIsDefaultUser] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if email matches default user
  useEffect(() => {
    const checkDefaultUser = async () => {
      if (!email || email.trim() === '') {
        setIsDefaultUser(false);
        return;
      }
      
      // Quick check: if email matches default user, set immediately
      if (email.toLowerCase().trim() === DEFAULT_USER_EMAIL.toLowerCase()) {
        setIsDefaultUser(true);
        return;
      }
      
      // Also check via API for flexibility
      try {
        const apiBase = getApiUrl();
        if (!apiBase) {
          return;
        }
        const response = await fetch(`${apiBase}/auth/check-default-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        setIsDefaultUser(data.isDefaultUser === true);
      } catch (err) {
        // If API fails, fall back to email check
        setIsDefaultUser(email.toLowerCase().trim() === DEFAULT_USER_EMAIL.toLowerCase());
      }
    };
    
    checkDefaultUser();
  }, [email, DEFAULT_USER_EMAIL]);

  // Do NOT override browser history. Let the natural back button behavior
  // take the user back to wherever they came from (typically the Homepage).

  // Redirect if already logged in (only check once on mount)
  useEffect(() => {
    const checkAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.role === 'SUPER_ADMIN' || userData.isSuperAdmin) {
            navigate('/super-admin', { replace: true });
          } else if (userData.role === 'ADMIN') {
            navigate('/admin-dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } catch (e) {
          // Invalid user data, stay on login page
        }
      }
    };
    
    // Only check after a small delay to avoid race conditions
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Fast-path: Allow single user login locally without backend
    try {
      const typedUser = (email || '').trim();
      const typedPass = (password || '').trim();
      if (SPECIAL_USER_IDS.has(typedUser.toLowerCase())) {
        // If password matches our configured/local fallback, login locally
        if (ARAKALA_SINGLE_USER_PASSWORD && typedPass === ARAKALA_SINGLE_USER_PASSWORD) {
          const localToken = 'local-arakala-auth-token';
          const localUser = {
            id: 'arakala-khammam',
            email: 'khammam@arakala.local',
            firstName: 'Arakala',
            lastName: 'Member',
            role: 'USER' as const
          };
          try {
            localStorage.setItem('token', localToken);
            localStorage.setItem('user', JSON.stringify(localUser));
          } catch {
            // ignore storage failures; navigation will still proceed
          }
          await new Promise((r) => setTimeout(r, 50));
          setLoading(false);
          navigate('/dashboard', { replace: true });
          return;
        }
        // If password doesn't match, show invalid and DO NOT call backend
        setLoading(false);
        setError('Invalid credentials for special login.');
        return;
      }
    } catch {
      // Fall through to normal login on any issue
    }

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.error('❌ Login timeout - request taking too long');
        setError('Login request timed out. Please check if the backend server is running.');
        setLoading(false);
      }
    }, 30000); // 30 second timeout

    try {
      // Login process started
      
      // Call the login function from AuthContext
      const result = await login(email, password);
      clearTimeout(timeoutId);
      
      // Check if login was successful - be flexible with response structure
      if (result && (result.success || result.token || result.user)) {
        console.log('✅ Login success:', result);
        
        // Wait for AuthContext to update state
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Get user from localStorage after state update
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            
            setLoading(false);
            const returnToHomepageForCustomize = sessionStorage.getItem(HOMEPAGE_CUSTOMIZE_AFTER_LOGIN_KEY) === 'true';

            // Navigate based on role
            if (returnToHomepageForCustomize) {
              navigate('/', { replace: true });
            } else if (user.role === 'SUPER_ADMIN' || user.isSuperAdmin) {
              navigate('/super-admin', { replace: true });
            } else if (user.role === 'ADMIN') {
              navigate('/admin-dashboard', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } catch (parseError) {
            console.error('❌ Error parsing user data:', parseError);
            setLoading(false);
            navigate('/dashboard', { replace: true });
          }
        } else {
          setLoading(false);
          const returnToHomepageForCustomize = sessionStorage.getItem(HOMEPAGE_CUSTOMIZE_AFTER_LOGIN_KEY) === 'true';
          navigate(returnToHomepageForCustomize ? '/' : '/dashboard', { replace: true });
        }
      } else {
        console.error('❌ Login failed: Invalid result:', result);
        throw new Error('Login failed: Invalid response structure');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setLoading(false);
      
      // Determine error message safely
      let errorMessage = 'Login failed. Please check your credentials.';
      
      try {
        if (err?.message && typeof err.message === 'string') {
          if (err.message.includes('connect to server') || err.message.includes('Network Error')) {
            errorMessage = 'Unable to connect to server. Please check if the backend is running.';
          } else if (err.message.includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
          } else {
            errorMessage = err.message;
          }
        } else if (err?.response?.data) {
          if (err.response.data.message) {
            errorMessage = err.response.data.message;
          } else if (err.response.data.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
            errorMessage = err.response.data.errors[0].msg || err.response.data.errors[0].message || errorMessage;
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }
      } catch (msgError) {
        // Keep default error message
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${colors.sidebarGradientStart} 0%, ${colors.sidebarGradientEnd} 100%)`
    }}>
      <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl w-full max-w-[450px] mx-4">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: colors.primary,
            marginBottom: '8px',
            letterSpacing: '1px',
            lineHeight: '1.15'
          }}>
            Arakala Family Member
          </div>
          <h1 style={{ color: colors.title, fontSize: '22px', margin: '0 0 6px 0' }}>
            Welcome Back
          </h1>
          <p style={{ color: colors.muted, margin: 0 }}>
            Sign in to your Arakala account
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEE2E2',
            color: colors.error,
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: colors.body,
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Username or Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter username or email"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#fff',
                color: '#000'
              }}
              onFocus={(e) => e.target.style.borderColor = colors.primary}
              onBlur={(e) => e.target.style.borderColor = colors.border}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{
                display: 'block',
                color: colors.body,
                fontWeight: '500'
              }}>
                Password
              </label>
              <Link 
                to="/forgot-password" 
                style={{ 
                  color: colors.primary, 
                  textDecoration: 'none', 
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: '#fff',
                color: '#000'
              }}
              onFocus={(e) => e.target.style.borderColor = colors.primary}
              onBlur={(e) => e.target.style.borderColor = colors.border}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = colors.primaryHover)}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = colors.primary)}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <Link
              to="/"
              style={{
                color: colors.primary,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Back to Home
            </Link>
          </div>
        </form>

        {/* Sign Up link removed per request */}
      </div>
    </div>
  );
};

export default Login;
