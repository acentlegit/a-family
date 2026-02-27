import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../config/api';
import { colors } from '../styles/colors';
import { FaEnvelope } from 'react-icons/fa';

const AdminPanel: React.FC = () => {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    if (familyId) {
      fetchMembers();
    } else {
      fetchFirstFamily();
    }
  }, [familyId]);

  const fetchFirstFamily = async () => {
    try {
      const response = await api.get('/families');
      const families = response.data.data || [];
      if (families.length > 0) {
        navigate(`/admin/${families[0]._id}`);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get(`/admin/families/${familyId}/members`);
      if (response.data.success) {
        setMembers(response.data.members || []);
      } else {
        alert(response.data.message || 'Failed to fetch members');
      }
    } catch (error: any) {
      console.error('Failed to fetch members:', error);
      if (error.response?.status === 403) {
        alert('Admin access required');
        navigate('/families');
      } else if (error.response?.status === 404) {
        alert('Family not found');
        navigate('/families');
      } else {
        alert(error.response?.data?.message || 'Failed to fetch members');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      alert('Please enter an email address');
      return;
    }
    try {
      const response = await api.post(`/invitations/${familyId}`, {
        email: inviteEmail.trim(),
      });
      if (response.data.success) {
        alert('Invitation sent successfully!');
        setInviteEmail('');
      } else {
        alert(response.data.message || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('Send invitation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send invitation';
      alert(errorMessage);
    }
  };

  const handleGenerateQR = async () => {
    if (!familyId) {
      alert('Family ID is required');
      return;
    }
    try {
      const response = await api.get(`/admin/families/${familyId}/invite-qr`);
      if (response.data.success && response.data.qrCode) {
        setQrCode(response.data.qrCode);
      } else {
        alert('Failed to generate QR code');
      }
    } catch (error: any) {
      console.error('Generate QR error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate QR code';
      alert(errorMessage);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailMessage.trim()) {
      alert('Please fill in both subject and message');
      return;
    }
    try {
      const response = await api.post(`/admin/families/${familyId}/send-email`, {
        subject: emailSubject.trim(),
        message: emailMessage.trim()
      });
      if (response.data.success) {
        alert(response.data.message || 'Email sent to all family members!');
        setShowEmailModal(false);
        setEmailSubject('');
        setEmailMessage('');
      } else {
        alert(response.data.message || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Send email error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send email';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: colors.title,
          marginBottom: '32px'
        }}>
          Admin Panel
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          {/* Invite Members */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: colors.title,
              marginBottom: '20px'
            }}>
              Invite Members
            </h2>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                style={{
                  padding: '12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                required
              />
              <button
                type="submit"
                style={{
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Send Invitation
              </button>
            </form>

            <div style={{ marginTop: '24px' }}>
              <button
                onClick={handleGenerateQR}
                style={{
                  background: colors.sectionBg,
                  color: colors.title,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                Generate QR Code
              </button>
              {qrCode && (
                <div style={{ textAlign: 'center' }}>
                  <img src={qrCode} alt="QR Code" style={{ maxWidth: '200px', margin: '0 auto' }} />
                </div>
              )}
            </div>
          </div>

          {/* Family Members */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: colors.title
              }}>
                Family Members
              </h2>
              <button
                onClick={() => setShowEmailModal(true)}
                style={{
                  background: colors.accentGold,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FaEnvelope /> Email All
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: colors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '16px'
                    }}>
                      {member.user?.firstName?.[0] || 'U'}
                      {member.user?.lastName?.[0] || ''}
                    </div>
                    <div>
                      <p style={{
                        fontWeight: '600',
                        color: colors.title,
                        margin: 0,
                        fontSize: '15px'
                      }}>
                        {member.user?.firstName} {member.user?.lastName}
                      </p>
                      <p style={{
                        color: colors.muted,
                        margin: 0,
                        fontSize: '13px'
                      }}>
                        {member.user?.email}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: member.role === 'Admin' ? colors.primarySoft : colors.sectionBg,
                    color: member.role === 'Admin' ? colors.primary : colors.title
                  }}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.title,
                marginBottom: '24px'
              }}>
                Send Email to All Members
              </h2>
              <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.title,
                    marginBottom: '8px'
                  }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.title,
                    marginBottom: '8px'
                  }}>
                    Message
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '16px',
                      minHeight: '150px',
                      resize: 'vertical'
                    }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      background: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Send Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false);
                      setEmailSubject('');
                      setEmailMessage('');
                    }}
                    style={{
                      flex: 1,
                      background: colors.sectionBg,
                      color: colors.title,
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
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

export default AdminPanel;
