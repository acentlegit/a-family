import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../config/api';
import { colors } from '../styles/colors';
import { FaUser, FaEdit, FaCheckCircle, FaTimes } from 'react-icons/fa';

interface Member {
  _id: string;
  firstName: string;
  lastName?: string;
  bio?: string;
  photo?: string;
  relationship?: string;
  dateOfBirth?: string;
}

const Bios: React.FC = () => {
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingBio, setEditingBio] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      loadBios();
    }
  }, [selectedFamilyId]);

  const loadFamilies = async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.data || []);
      if (response.data.data && response.data.data.length > 0) {
        setSelectedFamilyId(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error loading families:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBios = async () => {
    if (!selectedFamilyId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/bios/${selectedFamilyId}`);
      setMembers(response.data.data || []);
    } catch (error) {
      console.error('Error loading bios:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (member: Member) => {
    setEditingMemberId(member._id);
    setEditingBio(member.bio || '');
  };

  const cancelEditing = () => {
    setEditingMemberId(null);
    setEditingBio('');
  };

  const saveBio = async (memberId: string) => {
    if (!selectedFamilyId) return;
    
    setSaving(true);
    try {
      await api.put(`/bios/${selectedFamilyId}/${memberId}`, {
        bio: editingBio
      });
      
      // Update local state
      setMembers(members.map(m => 
        m._id === memberId 
          ? { ...m, bio: editingBio }
          : m
      ));
      
      setEditingMemberId(null);
      setEditingBio('');
    } catch (error: any) {
      console.error('Error saving bio:', error);
      alert(error.response?.data?.error || 'Failed to save bio');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !selectedFamilyId) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Loading...</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', color: 'white', marginBottom: '8px' }}>
            Family Member Bios
          </h1>
          <p style={{ color: 'white' }}>
            Write and manage biographies for each family member
          </p>
        </div>

        {families.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.body }}>
              Select Family
            </label>
            <select
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
              style={{
                padding: '12px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                fontSize: '15px',
                minWidth: '300px',
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
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>Loading bios...</p>
          </div>
        ) : members.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            background: colors.cardBg,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <p style={{ color: colors.muted }}>No family members found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {members.map((member) => (
              <div
                key={member._id}
                style={{
                  background: colors.cardBg,
                  borderRadius: '12px',
                  padding: '24px',
                  border: `1px solid ${colors.border}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '32px',
                    flexShrink: 0
                  }}>
                    {member.photo ? (
                      <img 
                        src={member.photo} 
                        alt={`${member.firstName} ${member.lastName || ''}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <FaUser />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '24px', 
                      color: colors.title,
                      marginBottom: '4px'
                    }}>
                      {member.firstName} {member.lastName || ''}
                    </h3>
                    {member.relationship && (
                      <p style={{ 
                        margin: 0, 
                        color: colors.muted, 
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        {member.relationship}
                      </p>
                    )}
                    {member.dateOfBirth && (
                      <p style={{ 
                        margin: 0, 
                        color: colors.muted, 
                        fontSize: '12px'
                      }}>
                        Born: {new Date(member.dateOfBirth).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {editingMemberId !== member._id && (
                    <button
                      onClick={() => startEditing(member)}
                      style={{
                        padding: '8px 16px',
                        background: colors.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        height: 'fit-content'
                      }}
                    >
                      <FaEdit /> Edit Bio
                    </button>
                  )}
                </div>

                {editingMemberId === member._id ? (
                  <div>
                    <textarea
                      value={editingBio}
                      onChange={(e) => setEditingBio(e.target.value)}
                      placeholder="Write the biography for this family member..."
                      style={{
                        width: '100%',
                        minHeight: '200px',
                        padding: '16px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontFamily: 'inherit',
                        lineHeight: '1.6',
                        resize: 'vertical',
                        background: colors.sectionBg,
                        color: colors.body,
                        marginBottom: '12px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => saveBio(member._id)}
                        disabled={saving}
                        style={{
                          padding: '10px 20px',
                          background: colors.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          opacity: saving ? 0.6 : 1
                        }}
                      >
                        <FaCheckCircle /> {saving ? 'Saving...' : 'Save Bio'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={saving}
                        style={{
                          padding: '10px 20px',
                          background: colors.muted,
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          opacity: saving ? 0.6 : 1
                        }}
                      >
                        <FaTimes /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    background: colors.sectionBg,
                    borderRadius: '8px',
                    minHeight: '100px',
                    color: colors.body,
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {member.bio ? (
                      <p style={{ margin: 0 }}>{member.bio}</p>
                    ) : (
                      <p style={{ margin: 0, color: colors.muted, fontStyle: 'italic' }}>
                        No biography written yet. Click "Edit Bio" to add one.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Bios;
