import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { colors } from '../styles/colors';
import api, { getApiUrl } from '../config/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // Use api instance for better error handling and automatic token management
      const response = await api.post('/auth/forgot-password', {
        email: email.trim()
      });

      if (response.data.success) {
        setSuccess(response.data.message || 'If an account exists with that email, a password reset link has been sent.');
      } else {
        setError(response.data.message || 'Failed to send reset email');
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      
      // Better error handling
      if (err.response) {
        // Server responded with error
        if (err.response.status === 503) {
          setError(err.response.data?.message || 'Email service is temporarily unavailable. Please contact support.');
          if (err.response.data?.hint) {
            console.error('Server hint:', err.response.data.hint);
          }
        } else if (err.response.status === 404) {
          setError('Password reset service is not available. Please contact support or ensure the server is running.');
        } else if (err.response.status === 400) {
          setError(err.response.data?.message || err.response.data?.errors?.[0]?.msg || 'Invalid email address');
        } else if (err.response.status === 500) {
          setError('Server error. Please try again later or contact support.');
        } else {
          setError(err.response.data?.message || 'Failed to send reset email');
        }
      } else if (err.request) {
        // Request was made but no response received
        setError('Network error. Please check your connection and try again.');
      } else {
        // Something else happened
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
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
            Forgot Password
          </h1>
          <p style={{ color: colors.muted, margin: 0 }}>
            Enter your email to receive a password reset link
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

        {success && (
          <div style={{
            background: '#D1FAE5',
            color: '#065F46',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
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
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: colors.muted, fontSize: '14px' }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: colors.primary, textDecoration: 'none', fontWeight: '600' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
