import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { 
  FaUsers, FaImages, FaCalendarAlt, FaPlus, FaBell,
  FaEdit, FaTrash, FaEnvelope, FaShieldAlt, FaHome,
  FaSearch, FaTimes
} from 'react-icons/fa';

type TabType = 'overview' | 'families' | 'users' | 'admins' | 'statistics' | 'activity-logs';

const SuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Overview state
  const [stats, setStats] = useState({
    totalFamilies: 0,
    totalMembers: 0,
    totalMemories: 0,
    totalEvents: 0,
    totalUsers: 0,
    totalAdmins: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Families state
  const [families, setFamilies] = useState<any[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [showCreateFamilyModal, setShowCreateFamilyModal] = useState(false);
  const [showEditFamilyModal, setShowEditFamilyModal] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [newFamily, setNewFamily] = useState({ name: '', description: '' });
  const [familySearch, setFamilySearch] = useState('');
  
  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'USER' as 'USER' | 'ADMIN',
    phone: '',
    dateOfBirth: '',
    gender: ''
  });
  const [userSearch, setUserSearch] = useState('');
  
  // Admins state
  const [admins, setAdmins] = useState<any[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showInviteAdminModal, setShowInviteAdminModal] = useState(false);
  const [inviteAdmin, setInviteAdmin] = useState({
    email: '',
    firstName: '',
    lastName: ''
  });
  
  // Statistics state
  const [systemStats, setSystemStats] = useState<any>({});
  
  // Activity Logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    // Wait a bit for auth context to load
    const checkAuth = setTimeout(() => {
      const userStr = localStorage.getItem('user');
      const tokenStr = localStorage.getItem('token');
      let userData = user;
      
      if (!userData && userStr) {
        try {
          userData = JSON.parse(userStr);
        } catch (e) {
          // Invalid user data
        }
      }

      // If no token, redirect to login
      if (!tokenStr) {
        navigate('/login', { replace: true });
        return;
      }

      // If user data exists, check if super admin
      if (userData) {
        const isSuperAdmin = userData.role === 'SUPER_ADMIN' || userData.isSuperAdmin;
        if (!isSuperAdmin) {
          navigate('/dashboard', { replace: true });
          return;
        }
        // Super admin confirmed, fetch data
        fetchOverviewData();
      } else {
        // User data not loaded yet, wait a bit more
        setTimeout(() => {
          const retryUserStr = localStorage.getItem('user');
          if (!retryUserStr) {
            navigate('/login', { replace: true });
          }
        }, 500);
      }
    }, 100);

    return () => clearTimeout(checkAuth);
  }, [user, authLoading, navigate]);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'families') {
      fetchFamilies();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'admins') {
      fetchAdmins();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    } else if (activeTab === 'activity-logs') {
      fetchActivityLogs();
      fetchAuditLogs();
    }
  }, [activeTab]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const [familiesRes, statsRes] = await Promise.all([
        api.get('/super-admin/families').catch(() => ({ data: { families: [] } })),
        api.get('/super-admin/stats').catch(() => ({ data: { stats: {} } }))
      ]);

      const allFamilies = familiesRes.data.families || [];
      setFamilies(allFamilies);

      const apiStats = statsRes.data.stats || {};
      if (apiStats.totalFamilies !== undefined) {
        setStats({
          totalFamilies: apiStats.totalFamilies || 0,
          totalMembers: apiStats.totalMembers || 0,
          totalMemories: apiStats.totalMemories || 0,
          totalEvents: apiStats.totalEvents || 0,
          totalUsers: apiStats.totalUsers || 0,
          totalAdmins: 0 // Will be calculated
        });
      }

      if (statsRes.data.recentActivity) {
        const activities: any[] = [];
        const recent = statsRes.data.recentActivity;
        
        if (recent.memories) {
          recent.memories.forEach((memory: any) => {
            activities.push({
              type: 'memory',
              familyName: memory.family?.name || 'Unknown',
              title: memory.title,
              date: memory.createdAt,
              icon: '📸'
            });
          });
        }

        if (recent.families) {
          recent.families.forEach((family: any) => {
            activities.push({
              type: 'family',
              familyName: family.name,
              title: `Family "${family.name}" created`,
              date: family.createdAt,
              icon: '🏠'
            });
          });
        }

        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivities(activities.slice(0, 10));
      }
    } catch (error: any) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilies = async () => {
    setFamiliesLoading(true);
    try {
      console.log('🔍 Fetching families from /super-admin/families...');
      const response = await api.get('/super-admin/families');
      console.log('✅ Families response:', response.data);
      
      if (response.data.success && response.data.families) {
        console.log(`✅ Found ${response.data.families.length} families`);
        setFamilies(response.data.families);
      } else if (response.data.families) {
        console.log(`✅ Found ${response.data.families.length} families (no success flag)`);
        setFamilies(response.data.families);
      } else {
        console.warn('⚠️ Unexpected response format:', response.data);
        setFamilies([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching families:', error);
      console.error('❌ Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch families';
      console.error('❌ Error details:', errorMsg);
      setFamilies([]);
    } finally {
      setFamiliesLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await api.get('/super-admin/users');
      if (response.data.success && response.data.users) {
        setUsers(response.data.users);
      } else if (response.data.users) {
        setUsers(response.data.users);
      } else {
        setUsers([]);
        console.warn('Unexpected response format:', response.data);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch users';
      console.error('Error details:', errorMsg);
      setUsers([]);
      // Don't show alert, just log the error
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const response = await api.get('/super-admin/users');
      let allUsers: any[] = [];
      if (response.data.success && response.data.users) {
        allUsers = response.data.users;
      } else if (response.data.users) {
        allUsers = response.data.users;
      }
      setAdmins(allUsers.filter((u: any) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' || u.isSuperAdmin));
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch admins';
      console.error('Error details:', errorMsg);
      setAdmins([]);
      // Don't show alert, just log the error
    } finally {
      setAdminsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/super-admin/stats');
      if (response.data.success && response.data.stats) {
        setSystemStats(response.data.stats);
      } else if (response.data.stats) {
        setSystemStats(response.data.stats);
      } else {
        console.warn('Unexpected stats response format:', response.data);
        setSystemStats({});
      }
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch statistics';
      console.error('Error details:', errorMsg);
      setSystemStats({});
    }
  };

  const fetchActivityLogs = async () => {
    setActivityLogsLoading(true);
    try {
      const response = await api.get('/super-admin/activity-logs?limit=100');
      if (response.data.success && response.data.logs) {
        const logs = response.data.logs;
        const allActivities: any[] = [];
        
        // Process families
        if (logs.families) {
          logs.families.forEach((family: any) => {
            allActivities.push({
              type: 'family',
              action: 'CREATE_FAMILY',
              title: `Family "${family.name}" created`,
              user: family.createdBy,
              target: family.name,
              date: family.createdAt,
              icon: '🏠',
              color: '#3B82F6'
            });
          });
        }
        
        // Process users
        if (logs.users) {
          logs.users.forEach((user: any) => {
            allActivities.push({
              type: 'user',
              action: 'CREATE_USER',
              title: `User "${user.firstName} ${user.lastName}" registered`,
              user: { firstName: user.firstName, lastName: user.lastName, email: user.email },
              target: `${user.firstName} ${user.lastName}`,
              date: user.createdAt,
              icon: '👤',
              color: '#10B981'
            });
          });
        }
        
        // Process memories
        if (logs.memories) {
          logs.memories.forEach((memory: any) => {
            allActivities.push({
              type: 'memory',
              action: 'CREATE_MEMORY',
              title: `Memory "${memory.title}" created`,
              user: memory.createdBy,
              target: memory.family?.name || 'Unknown Family',
              date: memory.createdAt,
              icon: '📸',
              color: '#EF4444'
            });
          });
        }
        
        // Process events
        if (logs.events) {
          logs.events.forEach((event: any) => {
            allActivities.push({
              type: 'event',
              action: 'CREATE_EVENT',
              title: `Event "${event.title}" created`,
              user: event.createdBy,
              target: event.family?.name || 'Unknown Family',
              date: event.createdAt,
              icon: '📅',
              color: '#F59E0B'
            });
          });
        }
        
        // Sort by date (newest first)
        allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setActivityLogs(allActivities);
      } else {
        setActivityLogs([]);
      }
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      setActivityLogs([]);
    } finally {
      setActivityLogsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/super-admin/audit-logs?limit=100');
      if (response.data.success && response.data.logs) {
        const auditActivities = response.data.logs.map((log: any) => {
          const actionMap: { [key: string]: { icon: string; color: string; label: string } } = {
            'CREATE_FAMILY': { icon: '🏠', color: '#3B82F6', label: 'Created Family' },
            'UPDATE_FAMILY': { icon: '✏️', color: '#3B82F6', label: 'Updated Family' },
            'DELETE_FAMILY': { icon: '🗑️', color: '#EF4444', label: 'Deleted Family' },
            'CREATE_USER': { icon: '👤', color: '#10B981', label: 'Created User' },
            'UPDATE_USER': { icon: '✏️', color: '#10B981', label: 'Updated User' },
            'DELETE_USER': { icon: '🗑️', color: '#EF4444', label: 'Deleted User' },
            'INVITE_ADMIN': { icon: '📧', color: '#8B5CF6', label: 'Invited Admin' },
            'TOGGLE_ADMIN': { icon: '🛡️', color: '#8B5CF6', label: 'Changed Admin Status' },
            'BULK_DELETE': { icon: '🗑️', color: '#EF4444', label: 'Bulk Deleted' },
            'EXPORT_DATA': { icon: '📥', color: '#6366F1', label: 'Exported Data' },
            'LOGIN': { icon: '🔐', color: '#10B981', label: 'Logged In' },
            'LOGOUT': { icon: '🚪', color: '#6B7280', label: 'Logged Out' },
            'OTHER': { icon: '⚙️', color: '#6B7280', label: 'Other Action' }
          };
          
          const actionInfo = actionMap[log.action] || actionMap['OTHER'];
          
          return {
            type: 'audit',
            action: log.action,
            title: `${actionInfo.label}${log.targetName ? `: ${log.targetName}` : ''}`,
            user: log.user,
            userEmail: log.userEmail,
            userRole: log.userRole,
            target: log.targetName || log.targetType || 'System',
            date: log.createdAt,
            icon: actionInfo.icon,
            color: actionInfo.color,
            method: log.method,
            endpoint: log.endpoint,
            status: log.status,
            ipAddress: log.ipAddress
          };
        });
        
        setAuditLogs(auditActivities);
      } else {
        setAuditLogs([]);
      }
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs([]);
    }
  };

  // Family CRUD operations
  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/super-admin/families', {
        name: newFamily.name,
        description: newFamily.description,
        createdBy: (user as any)?.id || (user as any)?._id
      });
      
      if (response.data.success) {
        alert('Family created successfully!');
        setShowCreateFamilyModal(false);
        setNewFamily({ name: '', description: '' });
        if (activeTab === 'families') {
          fetchFamilies();
        } else {
          fetchOverviewData();
        }
      } else {
        alert(response.data.message || 'Failed to create family');
      }
    } catch (error: any) {
      console.error('Create family error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to create family');
    }
  };

  const handleUpdateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily) return;
    try {
      await api.put(`/super-admin/families/${selectedFamily._id}`, {
        name: newFamily.name,
        description: newFamily.description
      });
      alert('Family updated successfully!');
      setShowEditFamilyModal(false);
      setSelectedFamily(null);
      setNewFamily({ name: '', description: '' });
      fetchFamilies();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update family');
    }
  };

  const handleDeleteFamily = async (familyId: string) => {
    if (!window.confirm('Are you sure? This will delete the family and ALL related data (members, memories, events, etc.). This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/super-admin/families/${familyId}`);
      alert('Family deleted successfully!');
      fetchFamilies();
      fetchOverviewData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete family');
    }
  };

  const openEditFamilyModal = (family: any) => {
    setSelectedFamily(family);
    setNewFamily({ name: family.name, description: family.description || '' });
    setShowEditFamilyModal(true);
  };

  // User CRUD operations
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/super-admin/users', newUser);
      alert('User created successfully!');
      setShowCreateUserModal(false);
      setNewUser({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'USER',
        phone: '',
        dateOfBirth: '',
        gender: ''
      });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.put(`/super-admin/users/${selectedUser._id}`, {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        dateOfBirth: newUser.dateOfBirth,
        gender: newUser.gender
      });
      alert('User updated successfully!');
      setShowEditUserModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure? This will delete the user and ALL their families and related data. This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/super-admin/users/${userId}`);
      alert('User deleted successfully!');
      fetchUsers();
      fetchAdmins();
      fetchOverviewData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const openEditUserModal = (userData: any) => {
    setSelectedUser(userData);
    setNewUser({
      email: userData.email,
      password: '',
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'USER',
      phone: userData.phone || '',
      dateOfBirth: userData.dateOfBirth || '',
      gender: userData.gender || ''
    });
    setShowEditUserModal(true);
  };

  // Admin invite
  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/super-admin/invite-admin', inviteAdmin);
      alert('Admin invitation sent successfully!');
      setShowInviteAdminModal(false);
      setInviteAdmin({ email: '', firstName: '', lastName: '' });
      fetchAdmins();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  // Filter functions
  const filteredFamilies = families.filter(f => 
    f.name.toLowerCase().includes(familySearch.toLowerCase()) ||
    f.description?.toLowerCase().includes(familySearch.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.lastName.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  const userStr = localStorage.getItem('user');
  let userData = user;
  if (!userData && userStr) {
    try {
      userData = JSON.parse(userStr);
    } catch (e) {}
  }

  if (!userData || (userData.role !== 'SUPER_ADMIN' && !userData.isSuperAdmin)) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accentGold} 100%)`,
          padding: '40px',
          borderRadius: '12px',
          marginBottom: '30px',
          color: 'white'
        }}>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }}>Super Admin Dashboard</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
            Manage all families, users, and system settings
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '30px',
          borderBottom: `2px solid ${colors.border}`,
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: FaHome },
            { id: 'families', label: 'Families', icon: FaHome },
            { id: 'users', label: 'Users', icon: FaUsers },
            { id: 'admins', label: 'Admins', icon: FaShieldAlt },
            { id: 'statistics', label: 'Statistics', icon: FaUsers },
            { id: 'activity-logs', label: 'Activity Logs', icon: FaBell }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              style={{
                padding: '12px 24px',
                background: activeTab === id ? colors.primary : 'transparent',
                color: activeTab === id ? 'white' : colors.body,
                border: 'none',
                borderBottom: activeTab === id ? `3px solid ${colors.primary}` : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: colors.cardBg,
                padding: '24px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: colors.primarySoft,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FaHome size={28} color={colors.primary} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '32px', color: colors.title, margin: '0 0 4px 0' }}>
                      {stats.totalFamilies}
                    </h3>
                    <p style={{ color: colors.muted, margin: 0, fontSize: '14px' }}>Total Families</p>
                  </div>
                </div>
              </div>

              <div style={{
                background: colors.cardBg,
                padding: '24px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: colors.accentSoft,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FaUsers size={28} color={colors.accentGold} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '32px', color: colors.title, margin: '0 0 4px 0' }}>
                      {stats.totalUsers}
                    </h3>
                    <p style={{ color: colors.muted, margin: 0, fontSize: '14px' }}>Total Users</p>
                  </div>
                </div>
              </div>

              <div style={{
                background: colors.cardBg,
                padding: '24px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: '#FEE2E2',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FaImages size={28} color="#DC2626" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '32px', color: colors.title, margin: '0 0 4px 0' }}>
                      {stats.totalMemories}
                    </h3>
                    <p style={{ color: colors.muted, margin: 0, fontSize: '14px' }}>Total Memories</p>
                  </div>
                </div>
              </div>

              <div style={{
                background: colors.cardBg,
                padding: '24px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: '#FEF3C7',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FaCalendarAlt size={28} color="#F59E0B" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '32px', color: colors.title, margin: '0 0 4px 0' }}>
                      {stats.totalEvents}
                    </h3>
                    <p style={{ color: colors.muted, margin: 0, fontSize: '14px' }}>Total Events</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div style={{
              background: colors.cardBg,
              padding: '24px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 20px 0' }}>
                <FaBell style={{ marginRight: '8px' }} />
                Recent Activities
              </h3>
              {recentActivities.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {recentActivities.map((activity, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: colors.sectionBg,
                        borderRadius: '8px',
                        marginBottom: index < recentActivities.length - 1 ? '8px' : 0
                      }}
                    >
                      <div style={{ fontSize: '24px' }}>{activity.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.title }}>
                          {activity.title}
                        </div>
                        <div style={{ fontSize: '12px', color: colors.muted }}>
                          {activity.familyName} • {new Date(activity.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ color: colors.muted, margin: 0 }}>No recent activities</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'families' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.muted }} />
                <input
                  type="text"
                  placeholder="Search families..."
                  value={familySearch}
                  onChange={(e) => setFamilySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 40px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setNewFamily({ name: '', description: '' });
                  setShowCreateFamilyModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <FaPlus /> Create Family
              </button>
            </div>

            {familiesLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 20px' }} />
                <p style={{ color: colors.muted, fontSize: '16px' }}>Loading families...</p>
              </div>
            ) : filteredFamilies.length > 0 ? (
              <div style={{
                display: 'grid',
                gap: '16px'
              }}>
                {filteredFamilies.map((family) => (
                  <div
                    key={family._id}
                    style={{
                      background: colors.cardBg,
                      padding: '20px',
                      borderRadius: '12px',
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', color: colors.title, fontSize: '18px' }}>
                        {family.name}
                      </h3>
                      <p style={{ margin: '0 0 8px 0', color: colors.muted, fontSize: '14px' }}>
                        {family.description || 'No description'}
                      </p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: colors.muted }}>
                        <span>👥 {family.stats?.members || family.members?.length || 0} members</span>
                        <span>📸 {family.stats?.memories || 0} memories</span>
                        <span>📅 {family.stats?.events || 0} events</span>
                      </div>
                      {family.createdBy && (
                        <p style={{ margin: '8px 0 0 0', color: colors.muted, fontSize: '12px' }}>
                          Created by: {typeof family.createdBy === 'object' 
                            ? `${family.createdBy.firstName} ${family.createdBy.lastName}`
                            : 'Unknown'}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openEditFamilyModal(family)}
                        style={{
                          padding: '8px 16px',
                          background: colors.primarySoft,
                          color: colors.primary,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteFamily(family._id)}
                        style={{
                          padding: '8px 16px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ color: colors.muted, fontSize: '16px' }}>
                  {familySearch ? 'No families found matching your search' : 'No families yet'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.muted }} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 40px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setNewUser({
                    email: '',
                    password: '',
                    firstName: '',
                    lastName: '',
                    role: 'USER',
                    phone: '',
                    dateOfBirth: '',
                    gender: ''
                  });
                  setShowCreateUserModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <FaPlus /> Create User
              </button>
            </div>

            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 20px' }} />
                <p style={{ color: colors.muted, fontSize: '16px' }}>Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div style={{
                background: colors.cardBg,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: colors.sectionBg }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: colors.title, fontSize: '14px', fontWeight: '600' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: colors.title, fontSize: '14px', fontWeight: '600' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: colors.title, fontSize: '14px', fontWeight: '600' }}>Role</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: colors.title, fontSize: '14px', fontWeight: '600' }}>Stats</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: colors.title, fontSize: '14px', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((userItem) => (
                      <tr key={userItem._id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '12px', color: colors.body }}>
                          {userItem.firstName} {userItem.lastName}
                        </td>
                        <td style={{ padding: '12px', color: colors.body }}>{userItem.email}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: userItem.role === 'SUPER_ADMIN' ? '#FEF3C7' : userItem.role === 'ADMIN' ? '#DBEAFE' : '#F3F4F6',
                            color: userItem.role === 'SUPER_ADMIN' ? '#F59E0B' : userItem.role === 'ADMIN' ? '#2563EB' : colors.muted
                          }}>
                            {userItem.role || 'USER'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: colors.muted, fontSize: '13px' }}>
                          {userItem.stats?.familiesCreated || 0} families created
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => openEditUserModal(userItem)}
                              style={{
                                padding: '6px 12px',
                                background: colors.primarySoft,
                                color: colors.primary,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px'
                              }}
                            >
                              <FaEdit /> Edit
                            </button>
                            {userItem._id !== userData?.id && (
                              <button
                                onClick={() => handleDeleteUser(userItem._id)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#FEE2E2',
                                  color: '#DC2626',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px'
                                }}
                              >
                                <FaTrash /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ color: colors.muted, fontSize: '16px' }}>
                  {userSearch ? 'No users found matching your search' : 'No users yet'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'admins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', color: colors.title, margin: 0 }}>
                Admin Users ({admins.length})
              </h3>
              <button
                onClick={() => {
                  setInviteAdmin({ email: '', firstName: '', lastName: '' });
                  setShowInviteAdminModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <FaEnvelope /> Invite Admin
              </button>
            </div>

            {adminsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 20px' }} />
                <p style={{ color: colors.muted, fontSize: '16px' }}>Loading admins...</p>
              </div>
            ) : admins.length > 0 ? (
              <div style={{
                background: colors.cardBg,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: colors.sectionBg }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: colors.title, fontSize: '14px', fontWeight: '600' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: colors.title, fontSize: '14px', fontWeight: '600' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: colors.title, fontSize: '14px', fontWeight: '600' }}>Role</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: colors.title, fontSize: '14px', fontWeight: '600' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin._id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '12px', color: colors.body }}>
                          {admin.firstName} {admin.lastName}
                        </td>
                        <td style={{ padding: '12px', color: colors.body }}>{admin.email}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: admin.role === 'SUPER_ADMIN' ? '#FEF3C7' : '#DBEAFE',
                            color: admin.role === 'SUPER_ADMIN' ? '#F59E0B' : '#2563EB'
                          }}>
                            {admin.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: admin.isVerified ? '#D1FAE5' : '#FEE2E2',
                            color: admin.isVerified ? '#065F46' : '#DC2626'
                          }}>
                            {admin.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ color: colors.muted, fontSize: '16px' }}>No admins yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <div>
            {Object.keys(systemStats).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 20px' }} />
                <p style={{ color: colors.muted, fontSize: '16px' }}>
                  Loading statistics...
                </p>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
                  System Statistics
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  {Object.entries(systemStats).map(([key, value]) => {
                    const formattedKey = key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())
                      .trim();
                    const iconMap: { [key: string]: string } = {
                      totalUsers: '👥',
                      totalFamilies: '🏠',
                      totalMembers: '👨‍👩‍👧‍👦',
                      totalMemories: '📸',
                      totalEvents: '📅',
                      totalAlbums: '📚',
                      totalMessages: '💬'
                    };
                    return (
                      <div
                        key={key}
                        style={{
                          background: colors.cardBg,
                          padding: '24px',
                          borderRadius: '12px',
                          border: `1px solid ${colors.border}`,
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '32px' }}>
                            {iconMap[key] || '📊'}
                          </div>
                          <h3 style={{ fontSize: '14px', color: colors.muted, margin: 0 }}>
                            {formattedKey}
                          </h3>
                        </div>
                        <p style={{ fontSize: '36px', color: colors.title, margin: 0, fontWeight: '700' }}>
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity-logs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: 0 }}>
                Activity Logs - All User & Admin Actions
              </h2>
              <button
                onClick={() => {
                  fetchActivityLogs();
                  fetchAuditLogs();
                }}
                style={{
                  padding: '8px 16px',
                  background: colors.primarySoft,
                  color: colors.primary,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh
              </button>
            </div>

            {activityLogsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 20px' }} />
                <p style={{ color: colors.muted, fontSize: '16px' }}>Loading activity logs...</p>
              </div>
            ) : (
              <div>
                {/* Combined Activity Logs */}
                <div style={{
                  background: colors.cardBg,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  padding: '24px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ fontSize: '18px', color: colors.title, margin: '0 0 16px 0' }}>
                    All Activities ({activityLogs.length + auditLogs.length})
                  </h3>
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {[...activityLogs, ...auditLogs].length > 0 ? (
                      [...activityLogs, ...auditLogs]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((activity, index) => {
                          const userName = activity.user 
                            ? (typeof activity.user === 'object' 
                                ? `${activity.user.firstName || ''} ${activity.user.lastName || ''}`.trim() || activity.user.email
                                : activity.userEmail || 'Unknown')
                            : activity.userEmail || 'Unknown';
                          
                          const userRole = activity.userRole || (activity.user?.role) || 'USER';
                          
                          return (
                            <div
                              key={index}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '16px',
                                background: colors.sectionBg,
                                borderRadius: '8px',
                                marginBottom: '12px',
                                borderLeft: `4px solid ${activity.color || colors.primary}`
                              }}
                            >
                              <div style={{ fontSize: '24px', flexShrink: 0 }}>
                                {activity.icon || '📋'}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <div style={{ fontSize: '15px', fontWeight: '600', color: colors.title }}>
                                    {activity.title}
                                  </div>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    background: userRole === 'SUPER_ADMIN' ? '#FEF3C7' : userRole === 'ADMIN' ? '#DBEAFE' : '#F3F4F6',
                                    color: userRole === 'SUPER_ADMIN' ? '#F59E0B' : userRole === 'ADMIN' ? '#2563EB' : colors.muted
                                  }}>
                                    {userRole}
                                  </span>
                                </div>
                                <div style={{ fontSize: '13px', color: colors.muted, marginBottom: '4px' }}>
                                  👤 {userName} {activity.target && `• ${activity.target}`}
                                </div>
                                <div style={{ fontSize: '12px', color: colors.muted }}>
                                  🕒 {new Date(activity.date).toLocaleString()}
                                  {activity.method && ` • ${activity.method} ${activity.endpoint}`}
                                  {activity.ipAddress && ` • IP: ${activity.ipAddress}`}
                                  {activity.status && (
                                    <span style={{
                                      marginLeft: '8px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      background: activity.status === 'SUCCESS' ? '#D1FAE5' : '#FEE2E2',
                                      color: activity.status === 'SUCCESS' ? '#065F46' : '#DC2626'
                                    }}>
                                      {activity.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <p style={{ color: colors.muted, fontSize: '16px' }}>No activity logs found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Activities Summary */}
                <div style={{
                  background: colors.cardBg,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  padding: '24px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ fontSize: '18px', color: colors.title, margin: '0 0 16px 0' }}>
                    User Activities ({activityLogs.length})
                  </h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {activityLogs.length > 0 ? (
                      activityLogs.map((activity, index) => {
                        const userName = activity.user 
                          ? (typeof activity.user === 'object' 
                              ? `${activity.user.firstName || ''} ${activity.user.lastName || ''}`.trim() || activity.user.email
                              : 'Unknown')
                          : 'Unknown';
                        
                        return (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              background: colors.sectionBg,
                              borderRadius: '8px',
                              marginBottom: '8px'
                            }}
                          >
                            <div style={{ fontSize: '20px' }}>{activity.icon}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.title }}>
                                {activity.title}
                              </div>
                              <div style={{ fontSize: '12px', color: colors.muted }}>
                                {userName} • {new Date(activity.date).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ color: colors.muted, fontSize: '14px' }}>No user activities</p>
                    )}
                  </div>
                </div>

                {/* Admin Audit Logs */}
                <div style={{
                  background: colors.cardBg,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  padding: '24px'
                }}>
                  <h3 style={{ fontSize: '18px', color: colors.title, margin: '0 0 16px 0' }}>
                    Admin Audit Logs ({auditLogs.length})
                  </h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log, index) => {
                        const userName = log.user 
                          ? (typeof log.user === 'object' 
                              ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email
                              : log.userEmail || 'Unknown')
                          : log.userEmail || 'Unknown';
                        
                        return (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              padding: '12px',
                              background: colors.sectionBg,
                              borderRadius: '8px',
                              marginBottom: '8px',
                              borderLeft: `3px solid ${log.color}`
                            }}
                          >
                            <div style={{ fontSize: '20px' }}>{log.icon}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.title, marginBottom: '4px' }}>
                                {log.title}
                              </div>
                              <div style={{ fontSize: '12px', color: colors.muted }}>
                                👤 {userName} ({log.userRole}) • {log.method} {log.endpoint}
                              </div>
                              <div style={{ fontSize: '11px', color: colors.muted, marginTop: '4px' }}>
                                🕒 {new Date(log.date).toLocaleString()}
                                {log.ipAddress && ` • IP: ${log.ipAddress}`}
                                <span style={{
                                  marginLeft: '8px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  background: log.status === 'SUCCESS' ? '#D1FAE5' : '#FEE2E2',
                                  color: log.status === 'SUCCESS' ? '#065F46' : '#DC2626'
                                }}>
                                  {log.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ color: colors.muted, fontSize: '14px' }}>No admin audit logs</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Family Modal */}
        {showCreateFamilyModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: colors.cardBg,
              padding: '32px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowCreateFamilyModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: colors.muted
                }}
              >
                <FaTimes />
              </button>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
                Create New Family
              </h2>
              <form onSubmit={handleCreateFamily}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Family Name *
                  </label>
                  <input
                    type="text"
                    value={newFamily.name}
                    onChange={(e) => setNewFamily({ ...newFamily, name: e.target.value })}
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
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Description
                  </label>
                  <textarea
                    value={newFamily.description}
                    onChange={(e) => setNewFamily({ ...newFamily, description: e.target.value })}
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
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateFamilyModal(false)}
                    style={{
                      padding: '12px 24px',
                      background: colors.sectionBg,
                      color: colors.body,
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      background: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Family Modal */}
        {showEditFamilyModal && selectedFamily && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: colors.cardBg,
              padding: '32px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              position: 'relative'
            }}>
              <button
                onClick={() => {
                  setShowEditFamilyModal(false);
                  setSelectedFamily(null);
                }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: colors.muted
                }}
              >
                <FaTimes />
              </button>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
                Edit Family
              </h2>
              <form onSubmit={handleUpdateFamily}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Family Name *
                  </label>
                  <input
                    type="text"
                    value={newFamily.name}
                    onChange={(e) => setNewFamily({ ...newFamily, name: e.target.value })}
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
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Description
                  </label>
                  <textarea
                    value={newFamily.description}
                    onChange={(e) => setNewFamily({ ...newFamily, description: e.target.value })}
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
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditFamilyModal(false);
                      setSelectedFamily(null);
                    }}
                    style={{
                      padding: '12px 24px',
                      background: colors.sectionBg,
                      color: colors.body,
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      background: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateUserModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: colors.cardBg,
              padding: '32px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <button
                onClick={() => setShowCreateUserModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: colors.muted
                }}
              >
                <FaTimes />
              </button>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
                Create New User
              </h2>
              <form onSubmit={handleCreateUser}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
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
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
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
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
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
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
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
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'USER' | 'ADMIN' })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
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
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Gender
                  </label>
                  <select
                    value={newUser.gender}
                    onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    style={{
                      padding: '12px 24px',
                      background: colors.sectionBg,
                      color: colors.body,
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      background: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditUserModal && selectedUser && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: colors.cardBg,
              padding: '32px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setSelectedUser(null);
                }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: colors.muted
                }}
              >
                <FaTimes />
              </button>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
                Edit User
              </h2>
              <form onSubmit={handleUpdateUser}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
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
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
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
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
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
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
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
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Gender
                  </label>
                  <select
                    value={newUser.gender}
                    onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditUserModal(false);
                      setSelectedUser(null);
                    }}
                    style={{
                      padding: '12px 24px',
                      background: colors.sectionBg,
                      color: colors.body,
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      background: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invite Admin Modal */}
        {showInviteAdminModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: colors.cardBg,
              padding: '32px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowInviteAdminModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: colors.muted
                }}
              >
                <FaTimes />
              </button>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
                Invite Admin
              </h2>
              <form onSubmit={handleInviteAdmin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={inviteAdmin.firstName}
                    onChange={(e) => setInviteAdmin({ ...inviteAdmin, firstName: e.target.value })}
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
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={inviteAdmin.lastName}
                    onChange={(e) => setInviteAdmin({ ...inviteAdmin, lastName: e.target.value })}
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
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={inviteAdmin.email}
                    onChange={(e) => setInviteAdmin({ ...inviteAdmin, email: e.target.value })}
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
                  <p style={{ fontSize: '12px', color: colors.muted, margin: '8px 0 0 0' }}>
                    An invitation email will be sent to this address
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowInviteAdminModal(false)}
                    style={{
                      padding: '12px 24px',
                      background: colors.sectionBg,
                      color: colors.body,
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      background: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SuperAdmin;
