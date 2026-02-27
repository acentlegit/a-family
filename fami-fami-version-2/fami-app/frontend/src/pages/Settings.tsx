import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaBell, FaLock, FaShieldAlt, FaCog } from 'react-icons/fa';
import api, { getApiUrl } from '../config/api';

const Settings: React.FC = () => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    hobbies: user?.hobbies || '',
    occupation: user?.occupation || '',
    bio: user?.bio || '',
    address: user?.address || '',
    city: user?.city || '',
    country: user?.country || ''
  });
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Notification state
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    eventReminders: true,
    newMemories: true
  });
  
  // Privacy state
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'everyone'
  });

  // S3 Configuration state
  const [s3Config, setS3Config] = useState({
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
    region: 'us-east-1',
    enabled: false
  });
  const [s3Testing, setS3Testing] = useState(false);
  const [hasExistingSecretKey, setHasExistingSecretKey] = useState(false);
  const [avatarError, setAvatarError] = useState(false);


  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
        hobbies: user.hobbies || '',
        occupation: user.occupation || '',
        bio: user.bio || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || ''
      });
      
      // Load S3 configuration
      loadS3Config();
      
      // Reset avatar error when user changes (avatar might have been updated)
      if (user.avatar) {
        setAvatarError(false);
        console.log('🔄 User avatar updated, resetting error state:', user.avatar);
      }
    }
  }, [user]);

  const loadS3Config = async () => {
    try {
      const response = await api.get('/auth/s3-config');
      if (response.data.success) {
        const config = response.data.config;
        setS3Config({
          accessKeyId: config.accessKeyId || '',
          secretAccessKey: '', // Never load secret key
          bucket: config.bucket || '',
          region: config.region || 'us-east-1',
          enabled: config.enabled || false
        });
        setHasExistingSecretKey(config.hasSecretKey);
      }
    } catch (error) {
      console.error('Error loading S3 config:', error);
    }
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/auth/update-profile', profileData);
      
      if (response.data.success) {
        setUser(response.data.user);
        showMessage('success', 'Profile updated successfully!');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showMessage('error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.data.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showMessage('success', 'Password changed successfully!');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      showMessage('error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Image size must be less than 5MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    setLoading(true);
    try {
      const response = await api.post('/auth/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        const updatedUser = response.data.user;
        console.log('✅ Avatar uploaded successfully:', updatedUser);
        console.log('✅ Avatar URL from backend:', updatedUser.avatar);
        
        // Reset avatar error state BEFORE updating user
        setAvatarError(false);
        
        // Update both context and localStorage
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Log the constructed URL for debugging
        const apiUrl = getApiUrl();
        const baseUrl = apiUrl.replace('/api', '');
        let finalUrl = '';
        if (updatedUser.avatar) {
          if (updatedUser.avatar.startsWith('http://') || updatedUser.avatar.startsWith('https://')) {
            finalUrl = updatedUser.avatar;
          } else if (updatedUser.avatar.startsWith('/uploads/')) {
            finalUrl = `${baseUrl}${updatedUser.avatar}`;
          } else if (updatedUser.avatar.startsWith('uploads/')) {
            finalUrl = `${baseUrl}/${updatedUser.avatar}`;
          } else {
            finalUrl = `${baseUrl}/uploads/${updatedUser.avatar}`;
          }
          console.log('✅ Final avatar URL that will be used:', finalUrl);
        }
        
        showMessage('success', 'Avatar updated successfully!');
        
        // Reset file input
        e.target.value = '';
        
        // Force a small delay to ensure state updates
        setTimeout(() => {
          console.log('🔄 Checking user state after update:', user?.avatar);
        }, 100);
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      showMessage('error', error.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.put('/auth/update-notifications', notifications);
      
      if (response.data.success) {
        showMessage('success', 'Notification preferences updated!');
      }
    } catch (error: any) {
      console.error('Error updating notifications:', error);
      showMessage('error', error.response?.data?.message || 'Failed to update notifications');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.put('/auth/update-privacy', privacy);
      
      if (response.data.success) {
        showMessage('success', 'Privacy settings updated!');
      }
    } catch (error: any) {
      console.error('Error updating privacy:', error);
      showMessage('error', error.response?.data?.message || 'Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FaUser },
    { id: 'storage', label: 'Storage', icon: FaCog },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'privacy', label: 'Privacy', icon: FaLock },
    { id: 'security', label: 'Security', icon: FaShieldAlt }
  ];

  const handleTestS3Config = async () => {
    if (!s3Config.accessKeyId || !s3Config.bucket) {
      showMessage('error', 'Please fill in Access Key ID and Bucket Name');
      return;
    }

    if (!s3Config.secretAccessKey && !hasExistingSecretKey) {
      showMessage('error', 'Please provide Secret Access Key');
      return;
    }

    setS3Testing(true);
    try {
      const testData: any = {
        accessKeyId: s3Config.accessKeyId,
        bucket: s3Config.bucket,
        region: s3Config.region
      };

      // Only send secret key if it's been changed
      if (s3Config.secretAccessKey) {
        testData.secretAccessKey = s3Config.secretAccessKey;
      }

      const response = await api.post('/auth/test-s3-config', testData);
      
      if (response.data.success) {
        showMessage('success', 'S3 connection successful! Configuration is valid.');
      }
    } catch (error: any) {
      console.error('Error testing S3 config:', error);
      showMessage('error', error.response?.data?.message || 'Failed to connect to S3');
    } finally {
      setS3Testing(false);
    }
  };

  const handleSaveS3Config = async () => {
    if (s3Config.enabled && (!s3Config.accessKeyId || !s3Config.bucket)) {
      showMessage('error', 'Please fill in Access Key ID and Bucket Name');
      return;
    }

    if (s3Config.enabled && !s3Config.secretAccessKey && !hasExistingSecretKey) {
      showMessage('error', 'Please provide Secret Access Key');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/auth/update-s3-config', s3Config);
      
      if (response.data.success) {
        showMessage('success', 'S3 configuration saved successfully!');
        await loadS3Config(); // Reload config
      }
    } catch (error: any) {
      console.error('Error saving S3 config:', error);
      showMessage('error', error.response?.data?.message || 'Failed to save S3 configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div>
        <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
          Settings
        </h2>

        {message.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px' }}>
          {/* Sidebar Tabs */}
          <div style={{
            background: colors.cardBg,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            padding: '16px'
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    background: activeTab === tab.id ? colors.primarySoft : 'transparent',
                    color: activeTab === tab.id ? colors.primary : colors.body,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: activeTab === tab.id ? '600' : '400',
                    textAlign: 'left',
                    marginBottom: '8px'
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div style={{
            background: colors.cardBg,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            padding: '32px'
          }}>
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileUpdate}>
                <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 24px 0' }}>
                  Profile Settings
                </h3>
                
                {/* Avatar Upload */}
                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {(() => {
                      // Get avatar URL
                      const getAvatarUrl = () => {
                        if (!user?.avatar) {
                          console.log('⚠️ No avatar URL in user object');
                          return null;
                        }
                        
                        const avatarUrl = user.avatar;
                        console.log('🔍 Avatar URL from user object:', avatarUrl);
                        
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
                        
                        console.log('✅ Extracted filename:', filename);
                        console.log('✅ Constructed final URL using current API base:', finalUrl);
                        return finalUrl;
                      };
                      
                      const avatarUrl = getAvatarUrl();
                      
                      return (
                        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
                          {avatarUrl && !avatarError ? (
                            <img
                              key={`avatar-${user?.avatar}`} // Force re-render when avatar URL changes
                              src={avatarUrl}
                              alt={`${user?.firstName || ''} ${user?.lastName || ''}`}
                              style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: `3px solid ${colors.border}`,
                                display: 'block',
                                position: 'relative',
                                zIndex: 2
                              }}
                              onLoad={() => {
                                console.log('✅ Avatar image loaded successfully! URL:', avatarUrl);
                                setAvatarError(false);
                              }}
                              onError={(e) => {
                                console.error('❌ Avatar image failed to load!');
                                console.error('❌ Attempted URL:', e.currentTarget.src);
                                console.error('❌ Original avatar URL from user:', user?.avatar);
                                setAvatarError(true);
                              }}
                            />
                          ) : null}
                          {(!avatarUrl || avatarError) && (
                            <div style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '50%',
                              backgroundColor: colors.primarySoft,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '48px',
                              color: colors.primary,
                              fontWeight: '600',
                              border: `3px solid ${colors.border}`,
                              position: avatarUrl && !avatarError ? 'absolute' : 'relative',
                              top: avatarUrl && !avatarError ? 0 : 'auto',
                              left: avatarUrl && !avatarError ? 0 : 'auto',
                              zIndex: avatarUrl && !avatarError ? 1 : 2
                            }}>
                              {`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
                            </div>
                          )}
                          <label style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: colors.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '3px solid white',
                            zIndex: 3
                          }}>
                            📷
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none',
                        background: colors.sectionBg,
                        cursor: 'not-allowed'
                      }}
                    />
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.muted }}>
                      Email cannot be changed
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="Enter phone number"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={profileData.dateOfBirth ? profileData.dateOfBirth.split('T')[0] : ''}
                        onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                        Gender
                      </label>
                      <select
                        value={profileData.gender}
                        onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Additional Personal Information */}
                  <div style={{ marginTop: '8px', paddingTop: '24px', borderTop: `1px solid ${colors.border}` }}>
                    <h4 style={{ fontSize: '16px', color: colors.title, margin: '0 0 16px 0' }}>Additional Information</h4>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                      Occupation / Job
                    </label>
                    <input
                      type="text"
                      value={profileData.occupation}
                      onChange={(e) => setProfileData({ ...profileData, occupation: e.target.value })}
                      placeholder="e.g., Software Engineer, Teacher, Doctor"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                      Hobbies & Interests
                    </label>
                    <input
                      type="text"
                      value={profileData.hobbies}
                      onChange={(e) => setProfileData({ ...profileData, hobbies: e.target.value })}
                      placeholder="e.g., Reading, Photography, Traveling, Sports"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                      Bio / About Me
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                      Address
                    </label>
                    <input
                      type="text"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      placeholder="Street address"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                        City
                      </label>
                      <input
                        type="text"
                        value={profileData.city}
                        onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                        placeholder="City"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                        Country
                      </label>
                      <input
                        type="text"
                        value={profileData.country}
                        onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                        placeholder="Country"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '12px 24px',
                      background: loading ? colors.muted : colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      width: 'fit-content'
                    }}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'storage' && (
              <div>
                <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 24px 0' }}>
                  Storage Settings
                </h3>
                
                {/* AWS S3 Configuration */}
                <div style={{ marginBottom: '32px', padding: '24px', background: colors.sectionBg, borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '18px', color: colors.title, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>☁️</span> AWS S3 Storage
                  </h4>
                  <p style={{ color: colors.muted, fontSize: '14px', marginBottom: '20px' }}>
                    Configure your AWS S3 bucket to store family photos and media in your own cloud storage.
                  </p>
                  
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                        Access Key ID
                      </label>
                      <input
                        type="text"
                        value={s3Config.accessKeyId}
                        onChange={(e) => setS3Config({ ...s3Config, accessKeyId: e.target.value })}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                        Secret Access Key
                      </label>
                      <input
                        type="password"
                        value={s3Config.secretAccessKey}
                        onChange={(e) => setS3Config({ ...s3Config, secretAccessKey: e.target.value })}
                        placeholder={hasExistingSecretKey ? "••••••••••••••••" : "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          fontSize: '15px',
                          outline: 'none'
                        }}
                      />
                      {hasExistingSecretKey && (
                        <p style={{ fontSize: '12px', color: colors.muted, marginTop: '4px' }}>
                          Leave blank to keep existing secret key
                        </p>
                      )}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                          Bucket Name
                        </label>
                        <input
                          type="text"
                          value={s3Config.bucket}
                          onChange={(e) => setS3Config({ ...s3Config, bucket: e.target.value })}
                          placeholder="my-family-photos"
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            fontSize: '15px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                          Region
                        </label>
                        <select
                          value={s3Config.region}
                          onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            fontSize: '15px',
                            outline: 'none',
                            background: 'white'
                          }}
                        >
                          <option value="us-east-1">US East (N. Virginia)</option>
                          <option value="us-east-2">US East (Ohio)</option>
                          <option value="us-west-1">US West (N. California)</option>
                          <option value="us-west-2">US West (Oregon)</option>
                          <option value="eu-west-1">EU (Ireland)</option>
                          <option value="eu-central-1">EU (Frankfurt)</option>
                          <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                          <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: s3Config.enabled ? '#D1FAE5' : '#FEE2E2', borderRadius: '8px' }}>
                      <input
                        type="checkbox"
                        checked={s3Config.enabled}
                        onChange={(e) => setS3Config({ ...s3Config, enabled: e.target.checked })}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <label style={{ color: s3Config.enabled ? '#065F46' : '#991B1B', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                        {s3Config.enabled ? '✅ S3 Storage Enabled' : '❌ S3 Storage Disabled'}
                      </label>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={handleTestS3Config}
                        disabled={s3Testing || !s3Config.accessKeyId || !s3Config.bucket}
                        style={{
                          padding: '12px 24px',
                          background: s3Testing ? colors.muted : colors.accentGold,
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: s3Testing || !s3Config.accessKeyId || !s3Config.bucket ? 'not-allowed' : 'pointer',
                          opacity: s3Testing || !s3Config.accessKeyId || !s3Config.bucket ? 0.6 : 1
                        }}
                      >
                        {s3Testing ? '🔄 Testing...' : '🧪 Test Connection'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSaveS3Config}
                        disabled={loading}
                        style={{
                          padding: '12px 24px',
                          background: loading ? colors.muted : colors.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.6 : 1
                        }}
                      >
                        {loading ? 'Saving...' : '💾 Save Configuration'}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '20px', padding: '16px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                    <p style={{ fontSize: '13px', color: '#1E40AF', margin: '0 0 8px 0', fontWeight: '600' }}>
                      ℹ️ How to get AWS S3 credentials:
                    </p>
                    <ol style={{ fontSize: '13px', color: '#1E40AF', margin: 0, paddingLeft: '20px' }}>
                      <li>Go to AWS Console → IAM → Users</li>
                      <li>Create a new user or select existing</li>
                      <li>Attach policy: AmazonS3FullAccess</li>
                      <li>Create access key → Copy credentials</li>
                      <li>Create an S3 bucket in your preferred region</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 24px 0' }}>
                  Notification Preferences
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates about family activities' },
                    { key: 'pushNotifications', label: 'Push Notifications', description: 'Get push notifications on your device' },
                    { key: 'eventReminders', label: 'Event Reminders', description: 'Receive reminders for upcoming events' },
                    { key: 'newMemories', label: 'New Memories', description: 'Get notified when new memories are shared' }
                  ].map((item) => (
                    <div key={item.key} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: colors.sectionBg,
                      borderRadius: '8px'
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', color: colors.title, fontSize: '15px' }}>
                          {item.label}
                        </h4>
                        <p style={{ margin: 0, color: colors.muted, fontSize: '13px' }}>
                          {item.description}
                        </p>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) => {
                            const newNotifications = { ...notifications, [item.key]: e.target.checked };
                            setNotifications(newNotifications);
                          }}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: notifications[item.key as keyof typeof notifications] ? colors.primary : colors.muted,
                          borderRadius: '26px',
                          transition: '0.4s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '',
                            height: '20px',
                            width: '20px',
                            left: notifications[item.key as keyof typeof notifications] ? '27px' : '3px',
                            bottom: '3px',
                            background: 'white',
                            borderRadius: '50%',
                            transition: '0.4s'
                          }} />
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleNotificationUpdate}
                  disabled={loading}
                  style={{
                    marginTop: '24px',
                    padding: '12px 24px',
                    background: loading ? colors.muted : colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div>
                <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 24px 0' }}>
                  Privacy Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{
                    padding: '20px',
                    background: colors.sectionBg,
                    borderRadius: '8px'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: colors.title }}>
                      Profile Visibility
                    </h4>
                    <p style={{ margin: '0 0 16px 0', color: colors.muted, fontSize: '14px' }}>
                      Control who can see your profile information
                    </p>
                    <select
                      value={privacy.profileVisibility}
                      onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    >
                      <option value="everyone">Everyone</option>
                      <option value="family">Family Members Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <button
                    onClick={handlePrivacyUpdate}
                    disabled={loading}
                    style={{
                      padding: '12px 24px',
                      background: loading ? colors.muted : colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      width: 'fit-content'
                    }}
                  >
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handlePasswordChange}>
                <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 24px 0' }}>
                  Security Settings
                </h3>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '12px 24px',
                      background: loading ? colors.muted : colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      width: 'fit-content'
                    }}
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
