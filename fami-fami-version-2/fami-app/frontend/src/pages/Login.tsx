import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.error('❌ Login timeout - request taking too long');
        setError('Login request timed out. Please check if the backend server is running.');
        setLoading(false);
      }
    }, 30000); // 30 second timeout

    try {
      console.log('🔍 Login - Starting login process...');
      console.log('🔍 Login - Email:', email);
      console.log('🔍 Login - API Base:', process.env.REACT_APP_API_BASE || 'Not configured');
      
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
            
            // Navigate based on role
            if (user.role === 'SUPER_ADMIN' || user.isSuperAdmin) {
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
          navigate('/dashboard', { replace: true });
        }
      } else {
        console.error('❌ Login failed: Invalid result:', result);
        throw new Error('Login failed: Invalid response structure');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setLoading(false);
      
      // Safe error logging
      try {
        console.error('❌ Login error:', err);
        console.error('❌ Login error message:', err?.message || 'Unknown error');
        
        if (err?.response) {
          console.error('❌ Login error status:', err.response.status);
          console.error('❌ Login error response:', err.response.data);
        } else {
          console.error('❌ Login error: No response (network error)');
        }
      } catch (logError) {
        console.error('❌ Error logging failed:', logError);
      }
      
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
        console.warn('⚠️  Error determining error message:', msgError);
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
      <div style={{
        background: colors.cardBg,
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '450px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: '700', 
            color: colors.primary,
            marginBottom: '10px',
            letterSpacing: '2px'
          }}>
            Fami
          </div>
          <h1 style={{ color: colors.title, fontSize: '28px', margin: '0 0 8px 0' }}>
            Welcome Back
          </h1>
          <p style={{ color: colors.muted, margin: 0 }}>
            Sign in to your Fami account
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
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s'
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
                transition: 'border-color 0.2s'
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
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: colors.muted, fontSize: '14px' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: colors.primary, textDecoration: 'none', fontWeight: '600' }}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
