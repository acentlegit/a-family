import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { FaUsers, FaHome, FaImages, FaCalendarAlt, FaEdit, FaTrash } from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [myFamilies, setMyFamilies] = useState<any[]>([]);

  useEffect(() => {
    // Check if user is ADMIN or SUPER_ADMIN
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch families where user is admin
      const familiesRes = await api.get('/families');
      setMyFamilies(familiesRes.data.data || []);

      // Fetch basic stats
      const statsData = {
        totalFamilies: familiesRes.data.data?.length || 0,
        totalMembers: 0,
        totalMemories: 0,
        totalEvents: 0
      };

      // Calculate totals
      for (const family of familiesRes.data.data || []) {
        statsData.totalMembers += family.members?.length || 0;
      }

      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFamily = async (familyId: string) => {
    if (!window.confirm('Are you sure you want to delete this family?')) return;
    
    try {
      await api.delete(`/families/${familyId}`);
      alert('Family deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting family:', error);
      alert('Failed to delete family');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: colors.body }}>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: colors.title, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MdDashboard style={{ color: colors.primary }} />
            Admin Dashboard
          </h1>
          <p style={{ color: colors.body, margin: 0 }}>Manage your families and content</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', borderBottom: `2px solid ${colors.border}`, flexWrap: 'wrap' }}>
          {['overview', 'families', 'members', 'content'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? `3px solid ${colors.primary}` : '3px solid transparent',
                color: activeTab === tab ? colors.primary : colors.body,
                fontWeight: activeTab === tab ? '600' : '400',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '16px'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            <h2 style={{ fontSize: '24px', color: colors.title, marginBottom: '24px' }}>Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <div style={{ background: colors.cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ width: '48px', height: '48px', background: `${colors.primary}20`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaHome size={24} color={colors.primary} />
                  </div>
                  <div>
                    <p style={{ color: colors.muted, fontSize: '14px', margin: 0 }}>Total Families</p>
                    <h3 style={{ color: colors.title, fontSize: '32px', fontWeight: '700', margin: 0 }}>{stats.totalFamilies}</h3>
                  </div>
                </div>
              </div>

              <div style={{ background: colors.cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ width: '48px', height: '48px', background: `${colors.success}20`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaUsers size={24} color={colors.success} />
                  </div>
                  <div>
                    <p style={{ color: colors.muted, fontSize: '14px', margin: 0 }}>Total Members</p>
                    <h3 style={{ color: colors.title, fontSize: '32px', fontWeight: '700', margin: 0 }}>{stats.totalMembers}</h3>
                  </div>
                </div>
              </div>

              <div style={{ background: colors.cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ width: '48px', height: '48px', background: `${colors.accentGold}20`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaImages size={24} color={colors.accentGold} />
                  </div>
                  <div>
                    <p style={{ color: colors.muted, fontSize: '14px', margin: 0 }}>Total Memories</p>
                    <h3 style={{ color: colors.title, fontSize: '32px', fontWeight: '700', margin: 0 }}>{stats.totalMemories}</h3>
                  </div>
                </div>
              </div>

              <div style={{ background: colors.cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ width: '48px', height: '48px', background: `${colors.warning}20`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaCalendarAlt size={24} color={colors.warning} />
                  </div>
                  <div>
                    <p style={{ color: colors.muted, fontSize: '14px', margin: 0 }}>Total Events</p>
                    <h3 style={{ color: colors.title, fontSize: '32px', fontWeight: '700', margin: 0 }}>{stats.totalEvents}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Families Tab */}
        {activeTab === 'families' && (
          <div>
            <h2 style={{ fontSize: '24px', color: colors.title, marginBottom: '24px' }}>My Families</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              {myFamilies.map((family) => (
                <div key={family._id} style={{ background: colors.cardBg, padding: '24px', borderRadius: '12px', border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: colors.title, margin: '0 0 8px 0', fontSize: '18px' }}>{family.name}</h3>
                    <p style={{ color: colors.body, margin: '0 0 8px 0', fontSize: '14px' }}>{family.description}</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                      <span style={{ color: colors.muted }}>Members: <strong>{family.members?.length || 0}</strong></span>
                      <span style={{ color: colors.muted }}>Created: <strong>{new Date(family.createdAt).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/families`, { state: { selectedFamilyId: family._id } })}
                      style={{ padding: '8px 16px', background: colors.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                      <FaEdit size={12} /> Manage
                    </button>
                    <button
                      onClick={() => handleDeleteFamily(family._id)}
                      style={{ padding: '8px 16px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                      <FaTrash size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {myFamilies.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: colors.muted }}>
                  <p>No families found. Create your first family to get started!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            <h2 style={{ fontSize: '24px', color: colors.title, marginBottom: '24px' }}>Family Members</h2>
            <p style={{ color: colors.muted }}>Select a family from the Families tab to manage members.</p>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div>
            <h2 style={{ fontSize: '24px', color: colors.title, marginBottom: '24px' }}>Content Management</h2>
            <p style={{ color: colors.muted }}>Manage memories, events, and media from your families.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;
