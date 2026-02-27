import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api, { getApiUrl } from '../config/api';
import { FaPlus, FaTrash, FaEdit, FaUser, FaTimes, FaDownload } from 'react-icons/fa';
import { FiImage } from 'react-icons/fi';

const Members: React.FC = () => {
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  // Helper function to create fresh member objects
  const createFreshMembers = () => {
    return Array.from({ length: 8 }, (_, index) => ({
      id: `member-${index}-${Date.now()}-${Math.random()}`,
      firstName: '',
      lastName: '',
      email: '',
      relationship: 'Other',
      sendEmail: true
    }));
  };

  const [bulkMembers, setBulkMembers] = useState(() => createFreshMembers());
  const [bulkAddLoading, setBulkAddLoading] = useState(false);
  
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'Male',
    relationship: 'Other',
    generation: 0,
    fatherId: '',
    motherId: '',
    spouseId: ''
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const relationshipOptions = [
    'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
    'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter',
    'Uncle', 'Aunt', 'Nephew', 'Niece', 'Cousin', 'Spouse', 'Other'
  ];

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchMembers(selectedFamilyId);
    }
  }, [selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedFamilyId(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    }
  };


  const fetchMembers = async (familyId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/members/${familyId}`);
      setMembers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('firstName', newMember.firstName);
      formData.append('lastName', newMember.lastName);
      formData.append('email', newMember.email);
      formData.append('gender', newMember.gender);
      formData.append('relationship', newMember.relationship);
      formData.append('generation', newMember.generation.toString());
      if (newMember.fatherId) formData.append('fatherId', newMember.fatherId);
      if (newMember.motherId) formData.append('motherId', newMember.motherId);
      if (newMember.spouseId) formData.append('spouseId', newMember.spouseId);
      if (selectedPhoto) formData.append('photo', selectedPhoto);

      await api.post(`/members/${selectedFamilyId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Member added successfully!');
      setShowAddModal(false);
      resetForm();
      await fetchMembers(selectedFamilyId);
      
      // Trigger a custom event to notify Dashboard to refresh
      window.dispatchEvent(new CustomEvent('memberAdded'));
    } catch (error: any) {
      console.error('Error adding member:', error);
      alert(error.response?.data?.message || 'Error adding member');
    }
  };

  const handleBulkAddMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    // Filter out empty members and remove the internal 'id' field
    const validMembers = bulkMembers
      .filter(m => m.firstName.trim() && m.lastName.trim())
      .map(({ id, ...member }) => member); // Remove 'id' field before sending
    
    if (validMembers.length === 0) {
      alert('Please add at least one member with first and last name');
      return;
    }

    setBulkAddLoading(true);
    try {
      const response = await api.post(`/members/${selectedFamilyId}/bulk`, {
        members: validMembers
      });

      alert(`Successfully added ${response.data.addedCount} members! ${response.data.emailsSent} invitation emails sent.`);
      setShowBulkAddModal(false);
      setBulkMembers(createFreshMembers());
      fetchMembers(selectedFamilyId);
    } catch (error: any) {
      console.error('Error adding members:', error);
      alert(error.response?.data?.message || 'Error adding members');
    } finally {
      setBulkAddLoading(false);
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const formData = new FormData();
      formData.append('firstName', editingMember.firstName);
      formData.append('lastName', editingMember.lastName || '');
      formData.append('email', editingMember.email || '');
      formData.append('gender', editingMember.gender);
      formData.append('relationship', editingMember.relationship);
      formData.append('generation', editingMember.generation.toString());
      if (editingMember.father) formData.append('fatherId', editingMember.father._id || editingMember.father);
      if (editingMember.mother) formData.append('motherId', editingMember.mother._id || editingMember.mother);
      if (editingMember.spouse) formData.append('spouseId', editingMember.spouse._id || editingMember.spouse);
      if (selectedPhoto) formData.append('photo', selectedPhoto);

      await api.put(`/members/${selectedFamilyId}/${editingMember._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Member updated successfully!');
      setShowEditModal(false);
      setEditingMember(null);
      resetForm();
      fetchMembers(selectedFamilyId);
    } catch (error: any) {
      console.error('Error updating member:', error);
      alert(error.response?.data?.message || 'Error updating member');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;

    try {
      await api.delete(`/members/${selectedFamilyId}/${memberId}`);
      alert('Member deleted successfully!');
      fetchMembers(selectedFamilyId);
    } catch (error: any) {
      console.error('Error deleting member:', error);
      alert(error.response?.data?.message || 'Error deleting member');
    }
  };

  const openEditModal = (member: any) => {
    setEditingMember(member);
    setPhotoPreview(member.photo || '');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setNewMember({
      firstName: '',
      lastName: '',
      email: '',
      gender: 'Male',
      relationship: 'Other',
      generation: 0,
      fatherId: '',
      motherId: '',
      spouseId: ''
    });
    setSelectedPhoto(null);
    setPhotoPreview('');
  };

  const handleExportMembers = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    try {
      const response = await api.get(`/families/${selectedFamilyId}/export-excel`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `members-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting members:', error);
      alert('Error exporting to Excel');
    }
  };


  if (loading && !selectedFamilyId) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  const potentialFathers = members.filter(m => m.gender === 'Male');
  const potentialMothers = members.filter(m => m.gender === 'Female');
  const potentialSpouses = members;

  return (
    <Layout selectedFamily={families.find(f => f._id === selectedFamilyId)}>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 8px 0' }}>Manage Members</h2>
            <p style={{ color: colors.muted, margin: 0 }}>Add and manage family members</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleExportMembers}
              disabled={!selectedFamilyId || members.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: (!selectedFamilyId || members.length === 0) ? colors.muted : '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (!selectedFamilyId || members.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              <FaDownload /> Export Excel
            </button>
            <button
              onClick={() => {
                // Reset members when opening modal
                setBulkMembers(createFreshMembers());
                setShowBulkAddModal(true);
              }}
              disabled={!selectedFamilyId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: !selectedFamilyId ? colors.muted : colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: !selectedFamilyId ? 'not-allowed' : 'pointer'
              }}
            >
              <span style={{ fontSize: '16px' }}>+</span> Add Members
            </button>
          </div>
        </div>

        {/* Family Selector */}
        <div style={{
          background: colors.cardBg,
          padding: '16px',
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          marginBottom: '24px'
        }}>
          <label style={{ display: 'block', color: colors.body, fontWeight: '600', marginBottom: '8px' }}>
            Select Family
          </label>
          <select
            value={selectedFamilyId}
            onChange={(e) => setSelectedFamilyId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '15px',
              outline: 'none',
              background: colors.cardBg,
              color: colors.body
            }}
          >
            {families.map((family) => (
              <option key={family._id} value={family._id}>
                {family.name}
              </option>
            ))}
          </select>
        </div>

        {/* Members Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : members.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {members.map((member) => (
              <div
                key={member._id}
                style={{
                  background: colors.cardBg,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  overflow: 'hidden'
                }}
              >
                {/* Photo */}
                <div style={{
                  height: '180px',
                  background: (() => {
                    // Construct proper photo URL
                    if (!member.photo || member.photo.trim() === '') {
                      return member.gender === 'Male' ? '#E0F2FE' : '#F0F9FF';
                    }
                    
                    const photo = member.photo.trim();
                    
                    // If already a full URL (http/https), use as-is (but fix localhost or HTTP)
                    if (photo.startsWith('http://') || photo.startsWith('https://')) {
                      if (photo.includes('localhost') || photo.startsWith('http://')) {
                        const apiBaseUrl = getApiUrl().replace('/api', '');
                        try {
                          const url = new URL(photo);
                          return `url(${apiBaseUrl}${url.pathname})`;
                        } catch {
                          return `url(${photo.replace(/http:\/\/[^/]+/, apiBaseUrl)})`;
                        }
                      }
                      return `url(${photo})`;
                    }
                    
                    // If it's a filename or relative path, construct full URL
                    const apiBaseUrl = getApiUrl().replace('/api', '');
                    
                    // Handle different path formats
                    if (photo.startsWith('/uploads/')) {
                      return `url(${apiBaseUrl}${photo})`;
                    } else if (photo.startsWith('uploads/')) {
                      return `url(${apiBaseUrl}/${photo})`;
                    } else if (photo.startsWith('/')) {
                      return `url(${apiBaseUrl}${photo})`;
                    } else {
                      // Just filename, add /uploads/ prefix
                      return `url(${apiBaseUrl}/uploads/${photo})`;
                    }
                  })(),
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {!member.photo && (
                    <FaUser size={60} color={member.gender === 'Male' ? colors.primary : colors.primary} />
                  )}
                  {/* Fallback if image fails to load */}
                  {member.photo && (
                    <img
                      src={(() => {
                        // Construct proper photo URL for img tag (fallback)
                        const photo = member.photo.trim();
                        if (photo.startsWith('http://') || photo.startsWith('https://')) {
                          // Replace any HTTP URLs or localhost URLs with current API base URL
                          if (photo.includes('localhost') || photo.startsWith('http://')) {
                            const apiBaseUrl = getApiUrl().replace('/api', '');
                            try {
                              const url = new URL(photo);
                              return `${apiBaseUrl}${url.pathname}`;
                            } catch {
                              return photo.replace(/http:\/\/[^/]+/, apiBaseUrl);
                            }
                          }
                          return photo;
                        }
                        const apiBaseUrl = getApiUrl().replace('/api', '');
                        if (photo.startsWith('/uploads/')) {
                          return `${apiBaseUrl}${photo}`;
                        } else if (photo.startsWith('uploads/')) {
                          return `${apiBaseUrl}/${photo}`;
                        } else if (photo.startsWith('/')) {
                          return `${apiBaseUrl}${photo}`;
                        } else {
                          return `${apiBaseUrl}/uploads/${photo}`;
                        }
                      })()}
                      alt={`${member.firstName} ${member.lastName}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: member.photo ? 'block' : 'none'
                      }}
                      onError={(e) => {
                        // Hide image if it fails to load, background will show
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('Member photo loaded successfully:', member.firstName, member.lastName);
                      }}
                    />
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '18px', color: colors.title, margin: '0 0 4px 0' }}>
                    {member.firstName} {member.lastName || ''}
                  </h3>
                  <p style={{ fontSize: '14px', color: colors.muted, margin: '0 0 8px 0' }}>
                    {member.relationship} • Gen {member.generation + 1}
                  </p>
                  {member.email && (
                    <p style={{ fontSize: '13px', color: colors.body, margin: '0 0 12px 0' }}>
                      {member.email}
                    </p>
                  )}

                  {/* Relationships */}
                  {(member.father || member.mother || member.spouse) && (
                    <div style={{
                      background: colors.sectionBg,
                      padding: '8px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontSize: '12px',
                      color: colors.body
                    }}>
                      {member.father && <div>👨 Father: {member.father.firstName}</div>}
                      {member.mother && <div>👩 Mother: {member.mother.firstName}</div>}
                      {member.spouse && <div>💑 Spouse: {member.spouse.firstName}</div>}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openEditModal(member)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: colors.primarySoft,
                        color: colors.primary,
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member._id)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#FEE2E2',
                        color: '#DC2626',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: colors.cardBg,
            padding: '60px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
              No members yet
            </h3>
            <p style={{ color: colors.muted, margin: '0 0 24px 0' }}>
              Add your first family member to get started
            </p>
          </div>
        )}
      </div>

      {/* Single Add Member Modal - REMOVED (using bulk add instead) */}
      {/* {showAddModal && ( ... )} */}

      {/* Bulk Add Members Modal */}
      {showBulkAddModal && (
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
          zIndex: 1000,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: 0 }}>
                Add Members
              </h2>
              <button
                onClick={() => setShowBulkAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: colors.muted
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{
              background: colors.sectionBg,
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <p style={{ margin: 0, color: colors.body, fontSize: '14px' }}>
                ✉️ <strong>Optional Fields:</strong> Fill in as many members as you want (1-8). Only first and last names are required. Members with valid email addresses will automatically receive an invitation email.
              </p>
            </div>

            <form onSubmit={handleBulkAddMembers}>
              <div style={{ display: 'grid', gap: '20px' }}>
                {bulkMembers.map((member, index) => (
                  <div key={member.id || `member-${index}`} style={{
                    background: colors.sectionBg,
                    padding: '20px',
                    borderRadius: '8px',
                    border: `2px solid ${bulkMembers[index]?.firstName || bulkMembers[index]?.lastName ? colors.primary : colors.border}`
                  }}>
                    <h4 style={{ margin: '0 0 16px 0', color: colors.title }}>
                      Member {index + 1}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          First Name {bulkMembers[index]?.firstName || bulkMembers[index]?.lastName ? '*' : '(optional)'}
                        </label>
                        <input
                          key={`firstName-${member.id || index}`}
                          type="text"
                          placeholder="Optional"
                          value={bulkMembers[index]?.firstName || ''}
                          onChange={(e) => {
                            const firstNameValue = e.target.value;
                            setBulkMembers((prevMembers) => {
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  return { ...m, firstName: firstNameValue };
                                }
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          Last Name {bulkMembers[index]?.firstName || bulkMembers[index]?.lastName ? '*' : '(optional)'}
                        </label>
                        <input
                          key={`lastName-${member.id || index}`}
                          type="text"
                          placeholder="Optional"
                          value={bulkMembers[index]?.lastName || ''}
                          onChange={(e) => {
                            const lastNameValue = e.target.value;
                            setBulkMembers((prevMembers) => {
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  return { ...m, lastName: lastNameValue };
                                }
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          Email (optional)
                        </label>
                        <input
                          id={`email-input-${index}-${member.id}`}
                          key={`email-${member.id || index}`}
                          type="email"
                          placeholder="Optional"
                          autoComplete="off"
                          value={bulkMembers[index]?.email || ''}
                          onChange={(e) => {
                            const emailValue = e.target.value;
                            setBulkMembers((prevMembers) => {
                              // Create a completely new array with new objects
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  // Create a completely new object for the updated member
                                  return {
                                    ...m,
                                    email: emailValue
                                  };
                                }
                                // Return a copy of existing member (not the same reference)
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '6px', fontSize: '13px' }}>
                          Relationship
                        </label>
                        <select
                          value={bulkMembers[index]?.relationship || 'Other'}
                          onChange={(e) => {
                            const relationshipValue = e.target.value;
                            setBulkMembers((prevMembers) => {
                              return prevMembers.map((m, i) => {
                                if (i === index) {
                                  return { ...m, relationship: relationshipValue };
                                }
                                return { ...m };
                              });
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          {relationshipOptions.map(rel => (
                            <option key={rel} value={rel}>{rel}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkAddModal(false)}
                  disabled={bulkAddLoading}
                  style={{
                    padding: '12px 24px',
                    background: colors.sectionBg,
                    color: colors.body,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: bulkAddLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkAddLoading}
                  style={{
                    padding: '12px 24px',
                    background: bulkAddLoading ? colors.muted : colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: bulkAddLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {bulkAddLoading ? 'Adding Members...' : 'Add Members & Send Invitations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
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
          zIndex: 1000,
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: colors.cardBg,
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: 0 }}>
                Edit Member
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                  resetForm();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <FaTimes size={20} color={colors.muted} />
              </button>
            </div>

            <form onSubmit={handleEditMember}>
              {/* Photo Upload */}
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <label style={{
                  display: 'inline-block',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: photoPreview ? `url(${photoPreview})` : colors.sectionBg,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `2px dashed ${colors.border}`,
                  cursor: 'pointer',
                  margin: '0 auto'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    {!photoPreview && <FiImage size={32} color={colors.muted} />}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                </label>
                <p style={{ fontSize: '12px', color: colors.muted, marginTop: '8px' }}>
                  Click to upload photo
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={editingMember.firstName}
                    onChange={(e) => setEditingMember({ ...editingMember, firstName: e.target.value })}
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
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editingMember.lastName || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, lastName: e.target.value })}
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editingMember.email || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Gender *
                  </label>
                  <select
                    value={editingMember.gender}
                    onChange={(e) => setEditingMember({ ...editingMember, gender: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      background: colors.cardBg
                    }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Relationship *
                  </label>
                  <select
                    value={editingMember.relationship}
                    onChange={(e) => setEditingMember({ ...editingMember, relationship: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      background: colors.cardBg
                    }}
                  >
                    {relationshipOptions.map(rel => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Generation (0 = oldest)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingMember.generation}
                  onChange={(e) => setEditingMember({ ...editingMember, generation: parseInt(e.target.value) })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Father
                  </label>
                  <select
                    value={editingMember.father?._id || editingMember.father || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, father: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      background: colors.cardBg
                    }}
                  >
                    <option value="">None</option>
                    {potentialFathers.map(m => (
                      <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                    Mother
                  </label>
                  <select
                    value={editingMember.mother?._id || editingMember.mother || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, mother: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      background: colors.cardBg
                    }}
                  >
                    <option value="">None</option>
                    {potentialMothers.map(m => (
                      <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Spouse
                </label>
                <select
                  value={editingMember.spouse?._id || editingMember.spouse || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, spouse: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    background: colors.cardBg
                  }}
                >
                  <option value="">None</option>
                  {potentialSpouses.filter(m => m._id !== editingMember._id).map(m => (
                    <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                    resetForm();
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
                  Update Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Members;
