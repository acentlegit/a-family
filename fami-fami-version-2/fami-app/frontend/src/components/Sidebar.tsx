import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, FaUsers, FaSitemap, FaImages, FaPhotoVideo, 
  FaCalendarAlt, FaVideo, FaCog, FaBars, FaTimes, FaBell, FaShieldAlt, FaDesktop
} from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';
import { colors } from '../styles/colors';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  selectedFamily?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedFamily }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [families, setFamilies] = useState<any[]>([]);
  const [showFamilies, setShowFamilies] = useState(true);

  // Memoize role checks to prevent re-renders
  const isSuperAdmin = useMemo(() => user?.role === 'SUPER_ADMIN' || user?.isSuperAdmin, [user?.role, user?.isSuperAdmin]);
  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user?.role]);

  const fetchFamilies = useCallback(async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.data || []);
    } catch (error) {
      console.error('Error fetching families:', error);
    }
  }, []);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  // Memoize the Super Admin click handler to prevent re-creation
  const handleSuperAdminClick = useCallback(() => {
    console.log('🔍 Sidebar - Clicking Super Admin, navigating to /super-admin');
    navigate('/super-admin');
  }, [navigate]);

  const menuItems = [
    { path: '/dashboard', icon: MdDashboard, label: 'Dashboard' },
    { path: '/families', icon: FaHome, label: 'My Families' },
    { path: '/members', icon: FaUsers, label: 'Manage Members' },
    { path: '/family-tree', icon: FaSitemap, label: 'Family Tree' },
    { path: '/memories', icon: FaImages, label: 'Family Memories' },
    { path: '/media', icon: FaPhotoVideo, label: 'Media Gallery' },
    { path: '/events', icon: FaCalendarAlt, label: 'Family Events' },
    { path: '/video-calls', icon: FaVideo, label: 'Video Calls' },
    { path: '/notifications', icon: FaBell, label: 'Notifications' },
    { path: '/settings', icon: FaCog, label: 'Settings' }
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1001,
          background: colors.primary,
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px',
          cursor: 'pointer',
          display: 'none'
        }}
        className="mobile-menu-toggle"
      >
        {isCollapsed ? <FaBars size={20} /> : <FaTimes size={20} />}
      </button>

      <div
        style={{
          width: isCollapsed ? '0' : '260px',
          height: '100vh',
          background: `linear-gradient(180deg, #001F3F 0%, #012a55 100%)`,
          position: 'fixed',
          left: 0,
          top: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'width 0.3s ease',
          zIndex: 1000,
          boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: 'white'
            }}>
              F
            </div>
            <div>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '700', margin: 0, letterSpacing: '0.5px' }}>
                Fami
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0 }}>
                {selectedFamily?.name || 'Family Dashboard'}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav style={{ padding: '20px 0' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            // Special handling for My Families with subsections
            if (item.path === '/families') {
              return (
                <div key={item.path}>
                  <Link
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      color: 'white',
                      textDecoration: 'none',
                      background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                      borderLeft: isActive ? '4px solid rgba(255,255,255,0.16)' : '4px solid transparent',
                      transition: 'all 0.2s ease',
                      fontSize: '15px',
                      fontWeight: isActive ? '600' : '400',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </div>
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowFamilies(!showFamilies);
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      {showFamilies ? <span>▼</span> : <span>▶</span>}
                    </div>
                  </Link>

                  {/* Family Subsections */}
                  {showFamilies && families.length > 0 && (
                    <div style={{ paddingLeft: '20px', marginTop: '4px', marginBottom: '4px' }}>
                      {families.map((family) => (
                        <div
                          key={family._id}
                          onClick={() => {
                            // Navigate to families page with family ID in state
                            navigate('/families', { state: { selectedFamilyId: family._id } });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            color: selectedFamily?._id === family._id ? 'white' : 'rgba(255,255,255,0.8)',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            borderLeft: selectedFamily?._id === family._id ? '2px solid white' : '2px solid rgba(255,255,255,0.2)',
                            background: selectedFamily?._id === family._id ? 'rgba(255,255,255,0.12)' : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            if (selectedFamily?._id !== family._id) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                            }
                          }}
                        >
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: selectedFamily?._id === family._id ? 'white' : 'rgba(255,255,255,0.6)'
                          }} />
                          <span style={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: selectedFamily?._id === family._id ? '600' : '400'
                          }}>
                            {family.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Regular menu items
            const isRouteActive = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  color: 'white',
                  textDecoration: 'none',
                  background: isRouteActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                  borderLeft: isRouteActive ? '4px solid rgba(255,255,255,0.16)' : '4px solid transparent',
                  transition: 'all 0.2s ease',
                  fontSize: '15px',
                  fontWeight: isRouteActive ? '600' : '400',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isRouteActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRouteActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Website Link - Visible to all authenticated users */}
          {true && (
            <>
              <div style={{
                height: '1px',
                background: 'rgba(255,255,255,0.1)',
                margin: '16px 20px'
              }} />
              <Link
                to="/website-admin"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  color: location.pathname.includes('/website-admin') ? 'white' : 'rgba(255,255,255,0.8)',
                  textDecoration: 'none',
                  background: location.pathname.includes('/website-admin') ? 'rgba(255,255,255,0.18)' : 'transparent',
                  borderLeft: location.pathname.includes('/website-admin') ? '4px solid rgba(255,255,255,0.16)' : '4px solid transparent',
                  transition: 'all 0.2s ease',
                  fontSize: '15px',
                  fontWeight: location.pathname.includes('/website-admin') ? '600' : '400'
                }}
                onMouseEnter={(e) => {
                  if (!location.pathname.includes('/website-admin')) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!location.pathname.includes('/website-admin')) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <FaDesktop size={20} />
                <span>Website</span>
              </Link>
            </>
          )}

          {/* Admin Dashboard Link - Only visible to Admins */}
          {isAdmin && !isSuperAdmin && (
            <>
              <div style={{
                height: '1px',
                background: 'rgba(255,255,255,0.1)',
                margin: '16px 20px'
              }} />
              <Link
                to="/admin-dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  color: 'white',
                  textDecoration: 'none',
                  background: location.pathname === '/admin-dashboard' ? 'rgba(255, 165, 0, 0.2)' : 'transparent',
                  borderLeft: location.pathname === '/admin-dashboard' ? '4px solid #FFA500' : '4px solid transparent',
                  transition: 'all 0.2s ease',
                  fontSize: '15px',
                  fontWeight: location.pathname === '/admin-dashboard' ? '600' : '400',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== '/admin-dashboard') {
                    e.currentTarget.style.background = 'rgba(255, 165, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== '/admin-dashboard') {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <FaShieldAlt size={20} color="#FFA500" />
                <span>Admin Dashboard</span>
              </Link>
            </>
          )}

          {/* Super Admin Link - Only visible to Super Admins */}
          {isSuperAdmin && (
            <>
              <div style={{
                height: '1px',
                background: 'rgba(255,255,255,0.1)',
                margin: '16px 20px'
              }} />
              <div
                onClick={handleSuperAdminClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  color: 'white',
                  textDecoration: 'none',
                  background: location.pathname === '/super-admin' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                  borderLeft: location.pathname === '/super-admin' ? '4px solid #FFD700' : '4px solid transparent',
                  transition: 'all 0.2s ease',
                  fontSize: '15px',
                  fontWeight: location.pathname === '/super-admin' ? '600' : '400',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== '/super-admin') {
                    e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== '/super-admin') {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <FaShieldAlt size={20} color="#FFD700" />
                <span>Super Admin</span>
              </div>
            </>
          )}
        </nav>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
