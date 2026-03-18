import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api from '../config/api';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

interface TimelineEvent {
  _id: string;
  year: string;
  title: string;
  description: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

const Timeline: React.FC = () => {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [newEvent, setNewEvent] = useState({ year: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchTimelineEvents();
    }
  }, [selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.data || []);
      if (response.data.data && response.data.data.length > 0) {
        setSelectedFamilyId(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineEvents = async () => {
    if (!selectedFamilyId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/timeline/${selectedFamilyId}`);
      setTimelineEvents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    if (!newEvent.year || !newEvent.title) {
      alert('Year and title are required');
      return;
    }

    try {
      setSaving(true);
      await api.post(`/timeline/${selectedFamilyId}`, newEvent);
      setNewEvent({ year: '', title: '', description: '' });
      setShowCreateModal(false);
      fetchTimelineEvents();
    } catch (error: any) {
      console.error('Error creating timeline event:', error);
      alert(error.response?.data?.message || 'Failed to create timeline event');
    } finally {
      setSaving(false);
    }
  };

  const handleEditEvent = (event: TimelineEvent) => {
    setEditingEvent(event);
    setNewEvent({ year: event.year, title: event.title, description: event.description || '' });
    setShowEditModal(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    if (!newEvent.year || !newEvent.title) {
      alert('Year and title are required');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/timeline/${editingEvent._id}`, newEvent);
      setEditingEvent(null);
      setNewEvent({ year: '', title: '', description: '' });
      setShowEditModal(false);
      fetchTimelineEvents();
    } catch (error: any) {
      console.error('Error updating timeline event:', error);
      alert(error.response?.data?.message || 'Failed to update timeline event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this timeline event?')) {
      return;
    }

    try {
      await api.delete(`/timeline/${eventId}`);
      fetchTimelineEvents();
    } catch (error: any) {
      console.error('Error deleting timeline event:', error);
      alert(error.response?.data?.message || 'Failed to delete timeline event');
    }
  };

  if (loading && !selectedFamilyId) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'white' }}>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: 'white', margin: '0 0 8px 0', fontWeight: '600' }}>Family Timeline</h2>
            <p style={{ color: 'white', margin: 0, opacity: 0.9 }}>Explore your family's history through important milestones</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {families.length > 0 && (
              <select
                value={selectedFamilyId}
                onChange={(e) => setSelectedFamilyId(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: '#fff',
                  color: '#000',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {families.map(family => (
                  <option key={family._id} value={family._id}>{family.name}</option>
                ))}
              </select>
            )}
            {selectedFamilyId && (
              <button
                onClick={() => {
                  setNewEvent({ year: '', title: '', description: '' });
                  setShowCreateModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.primary;
                }}
              >
                <FaPlus size={14} />
                Add Event
              </button>
            )}
          </div>
        </div>

        {!selectedFamilyId ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
            <p style={{ fontSize: '16px', margin: 0 }}>Please select a family to view timeline events</p>
          </div>
        ) : timelineEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
            <p style={{ fontSize: '16px', margin: 0 }}>No timeline events yet. Click "Add Event" to create your first milestone.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {timelineEvents.map((event) => (
              <div
                key={event._id}
                style={{
                  background: colors.cardBg,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(10px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accentGold} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: '700',
                    color: 'white',
                    flexShrink: 0,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  {event.year}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#000', fontSize: '20px', margin: '0 0 8px 0', fontWeight: '600' }}>
                    {event.title}
                  </h3>
                  <p style={{ color: colors.body, fontSize: '15px', margin: 0, lineHeight: '1.6' }}>
                    {event.description}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEditEvent(event)}
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: colors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.primarySoft;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title="Edit event"
                  >
                    <FaEdit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event._id)}
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: colors.error,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title="Delete event"
                  >
                    <FaTrash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div
            style={{
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
            }}
            onClick={() => setShowCreateModal(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: '#000', margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>Add Timeline Event</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Year *
                  </label>
                  <input
                    type="text"
                    value={newEvent.year}
                    onChange={(e) => setNewEvent({ ...newEvent, year: e.target.value })}
                    placeholder="e.g., 1985"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g., Migration to USA"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Description
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="e.g., Family moved to Dallas, Texas for new opportunities"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateEvent}
                    disabled={saving}
                    style={{
                      padding: '10px 20px',
                      background: colors.primary,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    {saving ? 'Saving...' : 'Create Event'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingEvent && (
          <div
            style={{
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
            }}
            onClick={() => {
              setShowEditModal(false);
              setEditingEvent(null);
            }}
          >
            <div
              style={{
                background: colors.cardBg,
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '20px' }}>Edit Timeline Event</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Year *
                  </label>
                  <input
                    type="text"
                    value={newEvent.year}
                    onChange={(e) => setNewEvent({ ...newEvent, year: e.target.value })}
                    placeholder="e.g., 1985"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g., Migration to USA"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Description
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="e.g., Family moved to Dallas, Texas for new opportunities"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingEvent(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateEvent}
                    disabled={saving}
                    style={{
                      padding: '10px 20px',
                      background: colors.primary,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    {saving ? 'Saving...' : 'Update Event'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Timeline;
