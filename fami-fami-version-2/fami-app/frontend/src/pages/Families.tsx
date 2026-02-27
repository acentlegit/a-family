import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api, { API_URL, getApiUrl } from '../config/api';
import { FaPlus, FaUsers, FaCalendar, FaImages, FaCalendarAlt, FaEdit, FaDownload, FaUpload } from 'react-icons/fa';
import axios from 'axios';

const Families: React.FC = () => {
  const location = useLocation();
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFamily, setNewFamily] = useState({ name: '', description: '' });
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [familyDetails, setFamilyDetails] = useState<any>(null);
  const [createdFamilyPasscode, setCreatedFamilyPasscode] = useState<string>('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFamilies();
  }, []);

  // Handle family selection from sidebar
  useEffect(() => {
    const state = location.state as any;
    if (state?.selectedFamilyId && families.length > 0) {
      const family = families.find(f => f._id === state.selectedFamilyId);
      if (family) {
        setSelectedFamily(family);
      }
    }
  }, [location.state, families]);

  useEffect(() => {
    if (selectedFamily) {
      fetchFamilyDetails(selectedFamily._id);
    }
  }, [selectedFamily]);

  const fetchFamilies = async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.data);
    } catch (error) {
      console.error('Error fetching families:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyDetails = async (familyId: string) => {
    try {
      setLoading(true);
      console.log('Fetching details for family:', familyId);
      
      const [familyRes, membersRes, memoriesRes, eventsRes] = await Promise.all([
        api.get(`/families/${familyId}`).catch(err => {
          console.error('Family fetch error:', err);
          return { data: { data: null } };
        }),
        api.get(`/members/${familyId}`).catch(err => {
          console.error('Members fetch error:', err);
          return { data: { data: [] } };
        }),
        api.get(`/memories/${familyId}`).catch(err => {
          console.error('Memories fetch error:', err);
          return { data: { data: [] } };
        }),
        api.get(`/events/${familyId}`).catch(err => {
          console.error('Events fetch error:', err);
          return { data: { data: [] } };
        })
      ]);
      
      const familyData = familyRes.data.data || familyRes.data;
      
      if (!familyData) {
        throw new Error('Family not found');
      }
      
      setFamilyDetails({
        family: familyData,
        members: membersRes.data.data || membersRes.data || [],
        memories: memoriesRes.data.data || memoriesRes.data || [],
        events: eventsRes.data.data || eventsRes.data || []
      });
      
      console.log('Family details loaded successfully');
    } catch (error: any) {
      console.error('Error fetching family details:', error);
      alert(error.message || 'Error loading family details. Please try again.');
      setSelectedFamily(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setShowEditModal(true);
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await api.delete(`/members/${selectedFamily._id}/${memberId}`);
      fetchFamilyDetails(selectedFamily._id);
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Error deleting member');
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFamily.name.trim()) {
      alert('Please enter a family name');
      return;
    }

    try {
      setLoading(true);
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
      fetchFamilies();
    } catch (error: any) {
      console.error('Error creating family:', error);
      alert(error.response?.data?.message || 'Failed to create family. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyClick = (family: any) => {
    setSelectedFamily(family);
  };

  const handleBackToList = () => {
    setSelectedFamily(null);
    setFamilyDetails(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/families/template/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'family-members-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template');
    }
  };

  const handleExportMembers = async (familyId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/families/${familyId}/export-excel`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `family-members-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting members:', error);
      alert('Failed to export members');
    }
  };

  const handleExportAllFamilies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/families/export-all`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `all-families-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting all families:', error);
      alert('Failed to export families');
    }
  };

  const handleImportMembers = async () => {
    if (!importFile || !selectedFamily) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/families/${selectedFamily._id}/import-excel`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      alert(response.data.message);
      setShowImportModal(false);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchFamilyDetails(selectedFamily._id);
    } catch (error: any) {
      console.error('Error importing members:', error);
      alert(error.response?.data?.message || 'Failed to import members');
    } finally {
      setImporting(false);
    }
  };

  // If a family is selected, show detailed view
  if (selectedFamily && familyDetails) {
    return (
      <Layout selectedFamily={selectedFamily}>
        <div>
          {/* Back Button */}
          <button
            onClick={handleBackToList}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: colors.sectionBg,
              color: colors.body,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            ← Back to All Families
          </button>

          {/* Family Header */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accentGold} 100%)`,
            padding: '40px',
            borderRadius: '12px',
            marginBottom: '30px',
            color: 'white'
          }}>
            <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }}>{selectedFamily.name}</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>{selectedFamily.description || 'No description'}</p>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{
              background: colors.cardBg,
              padding: '20px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: colors.primarySoft,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaUsers size={20} color={colors.primary} />
                </div>
                <div>
                  <h3 style={{ fontSize: '24px', color: colors.title, margin: 0 }}>{familyDetails.members.length}</h3>
                  <p style={{ color: colors.muted, margin: 0, fontSize: '13px' }}>Members</p>
                </div>
              </div>
            </div>

            <div style={{
              background: colors.cardBg,
              padding: '20px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: colors.accentSoft,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaImages size={20} color={colors.accentGold} />
                </div>
                <div>
                  <h3 style={{ fontSize: '24px', color: colors.title, margin: 0 }}>{familyDetails.memories.length}</h3>
                  <p style={{ color: colors.muted, margin: 0, fontSize: '13px' }}>Memories</p>
                </div>
              </div>
            </div>

            <div style={{
              background: colors.cardBg,
              padding: '20px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#FEF3C7',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaCalendarAlt size={20} color="#F59E0B" />
                </div>
                <div>
                  <h3 style={{ fontSize: '24px', color: colors.title, margin: 0 }}>{familyDetails.events.length}</h3>
                  <p style={{ color: colors.muted, margin: 0, fontSize: '13px' }}>Events</p>
                </div>
              </div>
            </div>
          </div>

          {/* Family Members Section */}
          <div style={{
            background: colors.cardBg,
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '20px', color: colors.title, margin: 0 }}>Family Members</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownloadTemplate}
                  style={{
                    padding: '8px 16px',
                    background: colors.accentSoft,
                    color: colors.accentGold,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FaDownload size={12} />
                  Template
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  style={{
                    padding: '8px 16px',
                    background: colors.primarySoft,
                    color: colors.primary,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FaUpload size={12} />
                  Import Excel
                </button>
                <button
                  onClick={() => handleExportMembers(selectedFamily._id)}
                  style={{
                    padding: '8px 16px',
                    background: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FaDownload size={12} />
                  Export Excel
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {familyDetails.members.map((member: any) => (
                  <div
                    key={member._id}
                    style={{
                      padding: '16px',
                      background: colors.sectionBg,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: colors.primary,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '600'
                    }}>
                      {member.user?.firstName?.[0] || member.email?.[0] || 'M'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, color: colors.title, fontSize: '15px' }}>
                        {member.user?.firstName || member.email}
                      </h4>
                      <p style={{ margin: 0, color: colors.muted, fontSize: '13px' }}>
                        {member.role} {member.relationship ? `• ${member.relationship}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditMember(member)}
                      style={{
                        padding: '6px 12px',
                        background: colors.primarySoft,
                        color: colors.primary,
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <FaEdit />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Recent Memories */}
          <div style={{
            background: colors.cardBg,
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 20px 0' }}>Recent Memories</h3>
            {familyDetails.memories.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {familyDetails.memories.slice(0, 6).map((memory: any) => (
                  <div
                    key={memory._id}
                    style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: colors.sectionBg
                    }}
                  >
                    {memory.media?.[0] && (
                      <div style={{
                        height: '150px',
                        background: `url(${memory.media[0].url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }} />
                    )}
                    <div style={{ padding: '12px' }}>
                      <h4 style={{ margin: '0 0 4px 0', color: colors.title, fontSize: '14px' }}>{memory.title}</h4>
                      <p style={{ margin: 0, color: colors.muted, fontSize: '12px' }}>
                        {new Date(memory.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: colors.muted, textAlign: 'center', padding: '20px 0' }}>No memories yet</p>
            )}
          </div>

          {/* Upcoming Events */}
          <div style={{
            background: colors.cardBg,
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 20px 0' }}>Upcoming Events</h3>
            {familyDetails.events.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {familyDetails.events.slice(0, 5).map((event: any) => (
                  <div
                    key={event._id}
                    style={{
                      padding: '16px',
                      background: colors.sectionBg,
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: colors.title, fontSize: '15px' }}>{event.title}</h4>
                      <p style={{ margin: 0, color: colors.muted, fontSize: '13px' }}>
                        {new Date(event.date).toLocaleDateString()} • {event.location}
                      </p>
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      background: colors.primarySoft,
                      color: colors.primary,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {event.attendees?.length || 0} attending
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: colors.muted, textAlign: 'center', padding: '20px 0' }}>No upcoming events</p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

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
    <Layout selectedFamily={families[0]}>
      <div>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '28px', color: colors.title, margin: '0 0 8px 0' }}>My Families</h2>
          <p style={{ color: colors.muted, margin: 0 }}>View and manage all your family groups</p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{
            background: colors.cardBg,
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: colors.primarySoft,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUsers size={24} color={colors.primary} />
            </div>
            <div>
              <h3 style={{ fontSize: '28px', color: colors.title, margin: '0 0 4px 0' }}>{families.length}</h3>
              <p style={{ color: colors.muted, margin: 0, fontSize: '14px' }}>Families</p>
            </div>
          </div>

          <div style={{
            background: colors.cardBg,
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: colors.accentSoft,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUsers size={24} color={colors.accentGold} />
            </div>
            <div>
              <h3 style={{ fontSize: '28px', color: colors.title, margin: '0 0 4px 0' }}>
                {families.reduce((acc, f) => acc + f.members.length, 0)}
              </h3>
              <p style={{ color: colors.muted, margin: 0, fontSize: '14px' }}>Total Members</p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 8px 0' }}>My Families</h2>
            <p style={{ color: colors.muted, margin: 0 }}>Manage and view all your family groups</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleExportAllFamilies}
              disabled={families.length === 0}
              style={{
                padding: '12px 20px',
                background: families.length === 0 ? colors.muted : '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: families.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaDownload size={14} />
              Export All
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '12px 24px',
                background: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaPlus size={14} />
              Create Family
            </button>
          </div>
        </div>

        {/* Families Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {families.map((family) => (
            <div
              key={family._id}
              onClick={() => handleFamilyClick(family)}
              style={{
                background: colors.cardBg,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                overflow: 'hidden',
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
              <div style={{
                height: '140px',
                background: (() => {
                  if (!family.coverImage) {
                    return `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accentGold} 100%)`;
                  }
                  // Fix coverImage URL - replace localhost or HTTP with current API base
                  let coverImageUrl = family.coverImage;
                  if (coverImageUrl.startsWith('http://') || coverImageUrl.startsWith('https://')) {
                    if (coverImageUrl.includes('localhost') || coverImageUrl.startsWith('http://')) {
                      const apiBaseUrl = getApiUrl().replace('/api', '');
                      try {
                        const url = new URL(coverImageUrl);
                        coverImageUrl = `${apiBaseUrl}${url.pathname}`;
                      } catch {
                        coverImageUrl = coverImageUrl.replace(/http:\/\/[^/]+/, apiBaseUrl);
                      }
                    }
                  } else {
                    // Relative path - construct full URL
                    const apiBaseUrl = getApiUrl().replace('/api', '');
                    coverImageUrl = coverImageUrl.startsWith('/') 
                      ? `${apiBaseUrl}${coverImageUrl}` 
                      : `${apiBaseUrl}/${coverImageUrl}`;
                  }
                  return `url(${coverImageUrl})`;
                })(),
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
                  {family.name}
                </h3>
                <p style={{ color: colors.muted, fontSize: '14px', margin: '0 0 16px 0' }}>
                  {family.description || 'No description'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaUsers size={16} color={colors.muted} />
                    <span style={{ color: colors.body, fontSize: '14px' }}>
                      {family.members.length} members
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {families.length === 0 && (
          <div style={{
            background: colors.cardBg,
            padding: '60px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👨‍👩‍👧‍👦</div>
            <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
              No families yet
            </h3>
            <p style={{ color: colors.muted, margin: '0 0 24px 0' }}>
              Create your first family to get started
            </p>
          </div>
        )}
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
              Your passcode has been saved to a text file in your Downloads folder
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
                ✅ <strong>Passcode saved!</strong> Check your Downloads folder for the text file with your family passcode.
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

      {/* Import Excel Modal */}
      {showImportModal && (
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
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 20px 0' }}>
              Import Members from Excel
            </h2>
            
            <div style={{
              background: colors.sectionBg,
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p style={{ color: colors.body, fontSize: '14px', margin: '0 0 12px 0' }}>
                <strong>Instructions:</strong>
              </p>
              <ol style={{ color: colors.muted, fontSize: '13px', margin: 0, paddingLeft: '20px' }}>
                <li>Download the Excel template</li>
                <li>Fill in member information</li>
                <li>Upload the completed file</li>
              </ol>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: colors.body,
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Select Excel File (.xlsx, .xls)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {importFile && (
              <div style={{
                background: '#D1FAE5',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#065F46', fontSize: '13px', margin: 0 }}>
                  ✓ File selected: {importFile.name}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={importing}
                style={{
                  padding: '10px 20px',
                  background: colors.sectionBg,
                  color: colors.body,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: importing ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportMembers}
                disabled={!importFile || importing}
                style={{
                  padding: '10px 20px',
                  background: !importFile || importing ? colors.muted : colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: !importFile || importing ? 'not-allowed' : 'pointer'
                }}
              >
                {importing ? 'Importing...' : 'Import Members'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Families;
