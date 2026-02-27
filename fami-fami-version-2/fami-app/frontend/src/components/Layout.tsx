import React, { ReactNode, useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { FaBell, FaTimes, FaTrash, FaUser } from 'react-icons/fa';
import { FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api, { getApiUrl } from '../config/api';

interface LayoutProps {
  children: ReactNode;
  selectedFamily?: any;
}

const Layout: React.FC<LayoutProps> = ({ children, selectedFamily }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Helper function to reconstruct avatar URL
  const getAvatarUrl = (avatarUrl: string | undefined): string | null => {
    if (!avatarUrl) return null;
    
    // Extract filename from the URL (handle both full URLs and relative paths)
    let filename = '';
    if (avatarUrl.includes('/uploads/')) {
      filename = avatarUrl.split('/uploads/')[1];
    } else if (avatarUrl.includes('uploads/')) {
      filename = avatarUrl.split('uploads/')[1];
    } else if (avatarUrl.startsWith('avatar-')) {
      filename = avatarUrl; // Already just the filename
    } else {
      // Try to extract filename from any URL format
      const parts = avatarUrl.split('/');
      filename = parts[parts.length - 1];
    }
    
    if (!filename) {
      console.error('❌ Could not extract filename from avatar URL:', avatarUrl);
      return null;
    }
    
    // Always construct URL using current API base URL to ensure it works
    const apiUrl = getApiUrl();
    const baseUrl = apiUrl.replace('/api', '');
    const finalUrl = `${baseUrl}/uploads/${filename}`;
    
    return finalUrl;
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications?limit=10');
      setNotifications(response.data.data || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await api.put('/notifications/mark-all-read');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${notificationId}`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
      setShowNotifications(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: any = {
      invitation: '✉️',
      event: '📅',
      memory: '📸',
      member_added: '👥',
      announcement: '📢',
      general: '🔔'
    };
    return icons[type] || '🔔';
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.appBg }}>
      <Sidebar selectedFamily={selectedFamily} />
      
      <div style={{ marginLeft: '260px', flex: 1, width: 'calc(100% - 260px)' }}>
        {/* Top Header */}
        <header style={{
          height: '70px',
          background: colors.cardBg,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 30px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div>
            <h1 style={{ fontSize: '24px', color: colors.title, margin: 0 }}>
              Dashboard
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Notifications */}
            <div style={{ position: 'relative' }} ref={notificationRef}>
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    fetchNotifications();
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '8px'
                }}
              >
                <FaBell size={20} color={showNotifications ? colors.primary : colors.muted} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    minWidth: '18px',
                    height: '18px',
                    background: colors.error,
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '10px',
                  background: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  width: '380px',
                  maxHeight: '500px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: colors.title, fontWeight: '600' }}>
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        disabled={loading}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: colors.primary,
                          fontSize: '13px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FiCheck size={12} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto'
                  }}>
                    {notifications.length === 0 ? (
                      <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: colors.muted
                      }}>
                        <FaBell size={32} color={colors.muted} style={{ marginBottom: '12px' }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => handleNotificationClick(notification)}
                          style={{
                            padding: '16px 20px',
                            borderBottom: `1px solid ${colors.border}`,
                            cursor: notification.link ? 'pointer' : 'default',
                            background: notification.read ? 'transparent' : colors.primarySoft,
                            transition: 'background 0.2s',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            if (notification.link) {
                              e.currentTarget.style.background = colors.sectionBg;
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = notification.read ? 'transparent' : colors.primarySoft;
                          }}
                        >
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                            <div style={{
                              fontSize: '24px',
                              flexShrink: 0
                            }}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'start',
                                marginBottom: '4px'
                              }}>
                                <h4 style={{
                                  margin: 0,
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: colors.title
                                }}>
                                  {notification.title}
                                </h4>
                                <button
                                  onClick={(e) => deleteNotification(notification._id, e)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: colors.muted,
                                    padding: '4px',
                                    marginLeft: '8px'
                                  }}
                                  title="Delete notification"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                              <p style={{
                                margin: '0 0 6px 0',
                                fontSize: '13px',
                                color: colors.body,
                                lineHeight: '1.4'
                              }}>
                                {notification.message}
                              </p>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span style={{
                                  fontSize: '12px',
                                  color: colors.muted
                                }}>
                                  {getTimeAgo(notification.createdAt)}
                                </span>
                                {!notification.read && (
                                  <span style={{
                                    width: '8px',
                                    height: '8px',
                                    background: colors.primary,
                                    borderRadius: '50%'
                                  }} />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div style={{
                      padding: '12px 20px',
                      borderTop: `1px solid ${colors.border}`,
                      textAlign: 'center'
                    }}>
                      <button
                        onClick={() => {
                          navigate('/notifications');
                          setShowNotifications(false);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: colors.primary,
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        View All Notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                {(() => {
                  const avatarUrl = getAvatarUrl(user?.avatar);
                  return avatarUrl && !avatarError ? (
                    <img
                      src={avatarUrl}
                      alt={user?.firstName || 'User'}
                      style={{ 
                        width: '35px', 
                        height: '35px', 
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                      onError={() => {
                        console.error('❌ Header avatar image failed to load:', avatarUrl);
                        setAvatarError(true);
                      }}
                      onLoad={() => {
                        setAvatarError(false);
                      }}
                    />
                  ) : (
                    <FaUser size={35} color={colors.primary} />
                  );
                })()}
                <span style={{ color: colors.body, fontWeight: '500' }}>
                  {user?.firstName} {user?.lastName}
                </span>
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '10px',
                  background: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  minWidth: '180px',
                  zIndex: 1000
                }}>
                  <button
                    onClick={logout}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: colors.error,
                      fontWeight: '500'
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ padding: '30px' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
