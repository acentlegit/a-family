import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaLock, FaEye } from 'react-icons/fa';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

const AcceptInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(`/auth/accept-invite/${token}`, { password });
      
      if (response.data.success) {
        const { token: authToken, user } = response.data;
        
        // Save to localStorage
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update auth context
        setUser(user);
        
        setSuccess(true);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: colors.success,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '40px'
          }}>
            ✓
          </div>
          <h2 style={{ color: colors.title, marginBottom: '10px' }}>Welcome to Fami!</h2>
          <p style={{ color: colors.muted, marginBottom: '20px' }}>
            Your admin account has been activated successfully.
          </p>
          <p style={{ color: colors.muted, fontSize: '14px' }}>
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        maxWidth: '450px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: colors.primary,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px',
            fontWeight: '700',
            color: 'white'
          }}>
            F
          </div>
          <h2 style={{ color: colors.title, marginBottom: '10px' }}>Admin Invitation</h2>
          <p style={{ color: colors.muted, fontSize: '14px' }}>
            Set your password to activate your admin account
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: colors.title,
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <FaLock style={{
                position: 'absolute',
                left: '15px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.muted
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '12px 45px 12px 45px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = colors.primary}
                onBlur={(e) => e.target.style.borderColor = colors.border}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.muted,
                  padding: '5px'
                }}
              >
                {showPassword ? '👁️' : <FaEye />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: colors.title,
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <FaLock style={{
                position: 'absolute',
                left: '15px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.muted
              }} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                style={{
                  width: '100%',
                  padding: '12px 45px 12px 45px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = colors.primary}
                onBlur={(e) => e.target.style.borderColor = colors.border}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.muted,
                  padding: '5px'
                }}
              >
                {showConfirmPassword ? '👁️' : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? colors.muted : colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = colors.primaryHover;
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = colors.primary;
            }}
          >
            {loading ? 'Activating Account...' : 'Activate Admin Account'}
          </button>
        </form>

        <div style={{
          marginTop: '25px',
          textAlign: 'center',
          fontSize: '13px',
          color: colors.muted
        }}>
          <p>By activating your account, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
