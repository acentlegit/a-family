import React from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../styles/colors';

const Onboarding: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.primarySoft} 0%, white 50%, ${colors.accentSoft} 100%)`
    }}>
      <nav style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accentGold} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>
          Fami
        </h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link
            to="/login"
            style={{
              color: colors.primary,
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            style={{
              background: colors.primary,
              color: 'white',
              textDecoration: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 40px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{
            fontSize: '56px',
            fontWeight: '700',
            color: colors.title,
            marginBottom: '24px',
            lineHeight: '1.2'
          }}>
            Keep your family connected
            <br />
            <span style={{ color: colors.primary }}>with a private family website</span>
          </h1>
          <p style={{
            fontSize: '20px',
            color: colors.body,
            marginBottom: '32px',
            maxWidth: '600px',
            margin: '0 auto 32px auto'
          }}>
            Fami is a secure and private way to share and archive your family history.
            Share family photos, family trees, and updates with everyone that matters most.
          </p>
          <Link
            to="/register"
            style={{
              background: colors.primary,
              color: 'white',
              textDecoration: 'none',
              padding: '16px 32px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              display: 'inline-block'
            }}
          >
            Get started
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          marginBottom: '80px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.title,
              marginBottom: '12px'
            }}>
              100% Private
            </h3>
            <p style={{
              color: colors.body,
              fontSize: '16px',
              lineHeight: '1.6'
            }}>
              Share with confidence knowing only people you approve will have access to your family site.
              You can invite people by email directly, or users can request access themselves.
            </p>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.title,
              marginBottom: '12px'
            }}>
              Space for All your Photos and Videos
            </h3>
            <p style={{
              color: colors.body,
              fontSize: '16px',
              lineHeight: '1.6'
            }}>
              Preserve the moments that matter with photo albums. Upload multiple photos and videos at once,
              tag people, set descriptions, dates, and locations, and leave comments.
            </p>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌳</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.title,
              marginBottom: '12px'
            }}>
              Build your own interactive family tree
            </h3>
            <p style={{
              color: colors.body,
              fontSize: '16px',
              lineHeight: '1.6'
            }}>
              Build your own interactive family tree to share with everyone on the site! Use the editor
              to easily add and remove people, and add descriptions and metadata to relationships.
            </p>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          marginBottom: '40px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.title,
            marginBottom: '16px'
          }}>
            Stay connected with a private message board
          </h2>
          <p style={{
            color: colors.body,
            fontSize: '18px',
            lineHeight: '1.6'
          }}>
            Your Fami website comes with a members-only message board so you can stay connected.
          </p>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          marginBottom: '80px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.title,
            marginBottom: '16px'
          }}>
            Convenient Tools for Admins
          </h2>
          <p style={{
            color: colors.body,
            fontSize: '18px',
            marginBottom: '20px',
            lineHeight: '1.6'
          }}>
            Fami makes it easy for admins to administer your webpage. Promote any number of
            site users to page admins and they will be able to:
          </p>
          <ul style={{
            listStyle: 'disc',
            paddingLeft: '24px',
            color: colors.body,
            fontSize: '18px',
            lineHeight: '2'
          }}>
            <li>Restore deleted content</li>
            <li>Manage site users</li>
            <li>Easily merge duplicate profiles together</li>
            <li>Send emails to all your users at once</li>
            <li>...and more!</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: colors.title,
            marginBottom: '16px'
          }}>
            Ready to get started?
          </h2>
          <p style={{
            color: colors.body,
            fontSize: '18px',
            marginBottom: '32px'
          }}>
            Sign up to get your own private family website
          </p>
          <Link
            to="/register"
            style={{
              background: colors.primary,
              color: 'white',
              textDecoration: 'none',
              padding: '16px 32px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              display: 'inline-block'
            }}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
