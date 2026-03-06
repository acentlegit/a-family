import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';
import { FaUsers, FaImages, FaCalendarAlt, FaVideo, FaTree } from 'react-icons/fa';

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.primary} 0%, #012a55 100%)`,
      color: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Login/Register */}
      <header style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
          Fami
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {user ? (
            <>
              <span style={{ color: 'white', fontSize: '14px' }}>
                Welcome, {user.firstName} {user.lastName}
              </span>
              <Link
                to="/dashboard"
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '15px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
              >
                Go to Dashboard
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                style={{
                  color: 'white',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  fontSize: '15px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '15px',
                  padding: '8px 16px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '15px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '56px',
          fontWeight: 'bold',
          marginBottom: '20px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Welcome to Fami
        </h1>
        <p style={{
          fontSize: '20px',
          marginBottom: '50px',
          opacity: 0.9,
          maxWidth: '600px'
        }}>
          Connect with your family, share memories, and stay close no matter where you are.
        </p>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '30px',
          maxWidth: '1000px',
          width: '100%',
          marginTop: '40px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '30px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <FaUsers size={40} style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Family Tree</h3>
            <p style={{ opacity: 0.8, fontSize: '14px' }}>
              Build and explore your family tree
            </p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '30px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <FaImages size={40} style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Memories</h3>
            <p style={{ opacity: 0.8, fontSize: '14px' }}>
              Share and preserve family memories
            </p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '30px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <FaCalendarAlt size={40} style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Events</h3>
            <p style={{ opacity: 0.8, fontSize: '14px' }}>
              Plan and celebrate family events
            </p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '30px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <FaVideo size={40} style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Video Calls</h3>
            <p style={{ opacity: 0.8, fontSize: '14px' }}>
              Connect face-to-face with family
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div style={{ marginTop: '50px' }}>
          <button
            onClick={() => {
              if (user) {
                navigate('/dashboard');
              } else {
                navigate('/login');
              }
            }}
            style={{
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: '600',
              background: 'white',
              color: colors.primary,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            {user ? 'Go to Dashboard' : 'Get Started'}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '20px 40px',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.2)',
        fontSize: '14px',
        opacity: 0.8
      }}>
        © 2024 Fami. All rights reserved.
      </footer>
    </div>
  );
};

export default Homepage;
