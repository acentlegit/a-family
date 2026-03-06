import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, FaUsers, FaSitemap, FaImages, FaPhotoVideo, 
  FaCalendarAlt, FaVideo, FaCog, FaBars, FaTimes, FaBell, FaShieldAlt, FaDesktop,
  FaUser, FaComment, FaMapMarkerAlt, FaClock
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
    { path: '/timeline', icon: FaClock, label: 'Timeline' },
    { path: '/migration-map', icon: FaMapMarkerAlt, label: 'Migration Map' },
    { path: '/memories', icon: FaImages, label: 'Family Memories' },
    { path: '/media', icon: FaPhotoVideo, label: 'Media Gallery' },
    { path: '/events', icon: FaCalendarAlt, label: 'Family Events' },
    { path: '/video-calls', icon: FaVideo, label: 'Video Calls' },
    { path: '/bios', icon: FaUser, label: 'Member Bios' },
    { path: '/blog', icon: FaComment, label: 'Family Blog' },
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
          background: 'rgba(0, 31, 63, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'fixed',
          left: 0,
          top: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'width 0.3s ease',
          zIndex: 1000,
          boxShadow: '2px 0 30px rgba(0,0,0,0.3)'
        }}
      >
        {/* Animated bubble overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        {/* Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: 'white',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
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
        <nav style={{ padding: '20px 0', position: 'relative', zIndex: 1 }}>
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
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderLeft: isActive ? '4px solid rgba(255,255,255,0.3)' : '4px solid transparent',
                      borderRadius: '12px',
                      margin: '6px 12px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontSize: '15px',
                      fontWeight: isActive ? '600' : '400',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                      e.currentTarget.style.transform = 'translateX(5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
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
                  background: isRouteActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderLeft: isRouteActive ? '4px solid rgba(255,255,255,0.3)' : '4px solid transparent',
                  borderRadius: '12px',
                  margin: '6px 12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: '15px',
                  fontWeight: isRouteActive ? '600' : '400',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isRouteActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Website Link - Only visible to ADMIN and SUPER_ADMIN */}
          {(isAdmin || isSuperAdmin) && (
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
                  color: 'white',
                  textDecoration: 'none',
                  background: location.pathname.includes('/website-admin') ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderLeft: location.pathname.includes('/website-admin') ? '4px solid rgba(255,255,255,0.3)' : '4px solid transparent',
                  borderRadius: '12px',
                  margin: '6px 12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: '15px',
                  fontWeight: location.pathname.includes('/website-admin') ? '600' : '400',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = location.pathname.includes('/website-admin') ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
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
                  background: location.pathname === '/admin-dashboard' ? 'rgba(255, 165, 0, 0.25)' : 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderLeft: location.pathname === '/admin-dashboard' ? '4px solid #FFA500' : '4px solid transparent',
                  borderRadius: '12px',
                  margin: '6px 12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: '15px',
                  fontWeight: location.pathname === '/admin-dashboard' ? '600' : '400',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 165, 0, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(255, 165, 0, 0.4)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 165, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = location.pathname === '/admin-dashboard' ? 'rgba(255, 165, 0, 0.25)' : 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
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
                  background: location.pathname === '/super-admin' ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderLeft: location.pathname === '/super-admin' ? '4px solid #FFD700' : '4px solid transparent',
                  borderRadius: '12px',
                  margin: '6px 12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: '15px',
                  fontWeight: location.pathname === '/super-admin' ? '600' : '400',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 215, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = location.pathname === '/super-admin' ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
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
