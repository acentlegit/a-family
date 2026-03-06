import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api from '../config/api';
import { FaEnvelope, FaTimes } from 'react-icons/fa';
import { FiSend } from 'react-icons/fi';

const Notifications: React.FC = () => {
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [emailData, setEmailData] = useState({
    subject: '',
    message: ''
  });

  useEffect(() => {
    fetchFamilies();
  }, []);

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

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId) {
      alert('Please select a family');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/notifications/send-email', {
        familyId: selectedFamilyId,
        subject: emailData.subject,
        message: emailData.message
      });

      alert(`Success! Sent ${response.data.emailsSent} emails to family members.`);
      setShowEmailModal(false);
      setEmailData({ subject: '', message: '' });
    } catch (error: any) {
      console.error('Error sending emails:', error);
      alert(error.response?.data?.message || 'Failed to send emails. Please check email configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout selectedFamily={families.find(f => f._id === selectedFamilyId)}>
      <div>
        <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
          Notifications & Emails
        </h2>

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
              padding: '12px',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '15px',
              outline: 'none'
            }}
          >
            {families.map((family) => (
              <option key={family._id} value={family._id}>
                {family.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notification Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '30px'
        }}>
          {/* Send Email to Family */}
          <div style={{
            background: colors.cardBg,
            padding: '32px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: colors.primarySoft,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <FaEnvelope size={28} color={colors.primary} />
            </div>
            <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
              Send Email to Family
            </h3>
            <p style={{ color: colors.muted, fontSize: '14px', margin: '0 0 20px 0' }}>
              Send a custom email message to all family members
            </p>
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={!selectedFamilyId}
              style={{
                width: '100%',
                padding: '12px',
                background: !selectedFamilyId ? colors.muted : colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: !selectedFamilyId ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FiSend size={14} />
              Compose Email
            </button>
          </div>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
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
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              padding: '32px',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', color: colors.title, margin: 0 }}>
                  Send Email to Family
                </h2>
                <button
                  onClick={() => setShowEmailModal(false)}
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
                  📧 This email will be sent to all family members who have email addresses registered.
                </p>
              </div>

              <form onSubmit={handleSendEmail}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '600', marginBottom: '8px' }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    required
                    placeholder="e.g., Family Reunion Update"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: colors.body, fontWeight: '600', marginBottom: '8px' }}>
                    Message *
                  </label>
                  <textarea
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    required
                    placeholder="Write your message here..."
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    disabled={loading}
                    style={{
                      padding: '12px 24px',
                      background: colors.sectionBg,
                      color: colors.body,
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Cancel
                  </button>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FiSend size={14} />
                    {loading ? 'Sending...' : 'Send Email'}
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

export default Notifications;
