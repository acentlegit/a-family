import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api from '../config/api';
import { FaUsers, FaImages, FaCalendarAlt, FaPlus, FaBell, FaVideo } from 'react-icons/fa';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  console.log('🔴🔴🔴 Dashboard component is rendering! 🔴🔴🔴');
  const [stats, setStats] = useState({
    totalFamilies: 0,
    totalMembers: 0,
    totalMemories: 0,
    totalEvents: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFamily, setNewFamily] = useState({ name: '', description: '' });
  const [createdFamilyPasscode, setCreatedFamilyPasscode] = useState<string>('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);

  useEffect(() => {
    // Just fetch data - no redirects
    console.log('🔍 Dashboard - Loading');
    fetchDashboardData();
    
    // Listen for member added events to refresh data
    const handleMemberAdded = () => {
      console.log('🔄 Member added, refreshing dashboard...');
      fetchDashboardData();
    };
    
    window.addEventListener('memberAdded', handleMemberAdded);
    
    return () => {
      window.removeEventListener('memberAdded', handleMemberAdded);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const familiesRes = await api.get('/families');
      const allFamilies = familiesRes.data.data || [];
      setFamilies(allFamilies);

      let totalMembers = 0;
      let totalMemories = 0;
      let totalEvents = 0;
      const activities: any[] = [];

      // Fetch all Member documents (family tree members) across all families
      let allFamilyTreeMembers = 0;
      try {
        const membersRes = await api.get('/members');
        allFamilyTreeMembers = membersRes.data.data?.length || 0;
      } catch (err) {
        console.error('Error fetching family tree members:', err);
      }

      for (const family of allFamilies) {
        // Count user members (people who joined the family)
        totalMembers += family.members?.length || 0;

        try {
          const [memoriesRes, eventsRes, familyMembersRes] = await Promise.all([
            api.get(`/memories/${family._id}`).catch(() => ({ data: { data: [] } })),
            api.get(`/events/${family._id}`).catch(() => ({ data: { data: [] } })),
            api.get(`/members/${family._id}`).catch(() => ({ data: { data: [] } }))
          ]);

          const memories = memoriesRes.data.data || [];
          const events = eventsRes.data.data || [];
          const familyTreeMembers = familyMembersRes.data.data || [];

          // Add family tree members to total (these are the Member documents)
          totalMembers += familyTreeMembers.length;

          totalMemories += memories.length;
          totalEvents += events.length;

          memories.forEach((memory: any) => {
            activities.push({
              type: 'memory',
              familyName: family.name,
              familyId: family._id,
              title: memory.title,
              date: memory.createdAt,
              icon: '📸',
              user: memory.createdBy
            });
          });

          events.forEach((event: any) => {
            activities.push({
              type: 'event',
              familyName: family.name,
              familyId: family._id,
              title: event.title,
              date: event.date,
              icon: '📅',
              location: event.location
            });
          });
        } catch (err) {
          console.error(`Error fetching data for family ${family._id}:`, err);
        }
      }

      setStats({
        totalFamilies: allFamilies.length,
        totalMembers,
        totalMemories,
        totalEvents
      });

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivities(activities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/families', newFamily);
      const createdFamily = response.data.data;
      
      // Save passcode to text file
      const passcodeText = `Family Name: ${createdFamily.name}\nFamily Passcode: ${createdFamily.passcode}\nCreated: ${new Date().toLocaleString()}\n\nIMPORTANT: Save this passcode! You'll need it to add members to this family.\n`;
      const blob = new Blob([passcodeText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${createdFamily.name.replace(/\s+/g, '_')}_Passcode.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setCreatedFamilyPasscode(createdFamily.passcode);
      setShowPasscodeModal(true);
      setShowCreateModal(false);
      setNewFamily({ name: '', description: '' });
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error creating family:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create family. Please try again.';
      alert(`Error: ${errorMessage}`);
    }
  };

  if (loading) {
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
        {/* Welcome Header */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accentGold} 100%)`,
          padding: '40px',
          borderRadius: '12px',
          marginBottom: '30px',
          color: 'white'
        }}>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }}>Welcome to Your Family Dashboard</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
            Manage your families, view updates, and stay connected
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div
            onClick={() => navigate('/families')}
            style={{
              background: colors.cardBg,
              padding: '24px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
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
                <FaUsers size={28} color={colors.primary} />
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
                  {stats.totalMembers}
                </h3>
                <p style={{ color: colors.muted, margin: 0, fontSize: '14px' }}>Total Members</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/memories')}
            style={{
              background: colors.cardBg,
              padding: '24px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
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

          <div
            onClick={() => navigate('/events')}
            style={{
              background: colors.cardBg,
              padding: '24px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
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

        {/* Quick Actions */}
        <div style={{
          background: colors.cardBg,
          padding: '24px',
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          marginBottom: '30px'
        }}>
          <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 20px 0' }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowCreateModal(true)}
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
            <button
              onClick={() => navigate('/video-calls')}
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
              <FaVideo /> Start Video Call
            </button>
            {/* Removed duplicate Add Members button - use the one in Members page */}
            <button
              onClick={() => navigate('/memories')}
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
              <FaImages /> Create Memory
            </button>
            <button
              onClick={() => navigate('/events')}
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
              <FaCalendarAlt /> Create Event
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Recent Activities */}
          <div style={{
            background: colors.cardBg,
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', color: colors.title, margin: 0 }}>
                <FaBell style={{ marginRight: '8px' }} />
                Recent Activities
              </h3>
            </div>

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
                      <div style={{ fontSize: '14px', fontWeight: '600', color: colors.title, marginBottom: '4px' }}>
                        {activity.title}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.muted }}>
                        {activity.familyName} • {new Date(activity.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      background: activity.type === 'memory' ? '#FEE2E2' : '#FEF3C7',
                      color: activity.type === 'memory' ? '#DC2626' : '#F59E0B',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {activity.type === 'memory' ? 'Memory' : 'Event'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                <p style={{ color: colors.muted, margin: 0 }}>No recent activities</p>
              </div>
            )}
          </div>

          {/* Your Families */}
          <div style={{
            background: colors.cardBg,
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', color: colors.title, margin: 0 }}>
                Your Families
              </h3>
              <button
                onClick={() => navigate('/families')}
                style={{
                  padding: '6px 12px',
                  background: colors.primarySoft,
                  color: colors.primary,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                View All
              </button>
            </div>

            {families.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {families.map((family) => (
                  <div
                    key={family._id}
                    onClick={() => navigate('/families')}
                    style={{
                      padding: '16px',
                      background: colors.sectionBg,
                      borderRadius: '8px',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', color: colors.title, fontSize: '16px' }}>
                          {family.name}
                        </h4>
                        <p style={{ margin: 0, color: colors.muted, fontSize: '13px' }}>
                          {family.members?.length || 0} members
                        </p>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: colors.primary,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: '600'
                      }}>
                        {family.name[0]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👨‍👩‍👧‍👦</div>
                <p style={{ color: colors.muted, margin: '0 0 16px 0' }}>No families yet</p>
                <button
                  onClick={() => navigate('/families')}
                  style={{
                    padding: '10px 20px',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Create Your First Family
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Family Modal */}
      {showCreateModal && (
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
            maxWidth: '500px'
          }}>
            <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
              Create New Family
            </h2>
            <form onSubmit={handleCreateFamily}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Family Name
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
                  onClick={() => setShowCreateModal(false)}
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

      {/* Passcode Display Modal */}
      {showPasscodeModal && (
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
            padding: '40px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: colors.primarySoft,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px'
            }}>
              🔐
            </div>
            <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 12px 0' }}>
              Family Created Successfully!
            </h2>
            <p style={{ color: colors.body, margin: '0 0 24px 0' }}>
              Your passcode has been saved to a text file
            </p>
            <div style={{
              background: colors.sectionBg,
              padding: '24px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <p style={{ color: colors.muted, fontSize: '14px', margin: '0 0 8px 0' }}>
                Family Passcode
              </p>
              <div style={{
                fontSize: '36px',
                fontWeight: '700',
                color: colors.primary,
                letterSpacing: '4px',
                fontFamily: 'monospace'
              }}>
                {createdFamilyPasscode}
              </div>
            </div>
            <div style={{
              background: '#D1FAE5',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <p style={{ color: '#065F46', fontSize: '14px', margin: 0 }}>
                ✅ <strong>Passcode saved!</strong> Check your Downloads folder for the text file.
              </p>
            </div>
            <button
              onClick={() => setShowPasscodeModal(false)}
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
              Got It!
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
