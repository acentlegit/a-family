import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api from '../config/api';
import { FaPlus, FaCalendar, FaMapMarkerAlt, FaVideo, FaTimes, FaEdit, FaTrash, FaCheckCircle, FaQuestionCircle } from 'react-icons/fa';

const Events: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventType: 'Reunion',
    startDate: '',
    endDate: '',
    location: '',
    isVirtual: false,
    virtualLink: ''
  });

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchEvents();
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
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!selectedFamilyId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/events/${selectedFamilyId}`);
      setEvents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    // Validate required fields
    if (!newEvent.title || !newEvent.startDate) {
      alert('Please fill in all required fields (Title and Start Date)');
      return;
    }

    try {
      const response = await api.post(`/events/${selectedFamilyId}`, {
        ...newEvent,
        isVirtual: Boolean(newEvent.isVirtual)
      });
      
      if (response.data.success) {
        setShowCreateModal(false);
        resetForm();
        fetchEvents();
        alert('Event created successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to create event');
      }
    } catch (error: any) {
      console.error('Error creating event:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error creating event. Please try again.';
      alert(errorMessage);
    }
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      await api.put(`/events/${editingEvent._id}`, editingEvent);
      setShowEditModal(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Error updating event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await api.delete(`/events/${eventId}`);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event. Please try again.');
    }
  };

  const handleRSVP = async (eventId: string, status: 'going' | 'not-going' | 'maybe') => {
    try {
      console.log('Sending RSVP:', { eventId, status });
      const response = await api.post(`/events/${eventId}/rsvp`, { status });
      console.log('RSVP response:', response.data);
      
      // Update the specific event in the list with the returned data
      setEvents(prevEvents => prevEvents.map(e => 
        e._id === eventId ? response.data.data : e
      ));
      
      console.log('Events updated in state');
    } catch (error: any) {
      console.error('Error updating RSVP:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.message || 'Error updating RSVP. Please try again.');
    }
  };

  const resetForm = () => {
    setNewEvent({
      title: '',
      description: '',
      eventType: 'Reunion',
      startDate: '',
      endDate: '',
      location: '',
      isVirtual: false,
      virtualLink: ''
    });
  };

  const openEditModal = (event: any) => {
    setEditingEvent({
      ...event,
      startDate: new Date(event.startDate).toISOString().slice(0, 16),
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const getUserRSVP = (event: any) => {
    const attendee = event.attendees?.find((a: any) => a.user === currentUser._id || a.user?._id === currentUser._id);
    return attendee?.status || null;
  };

  const renderEventForm = (isEdit: boolean) => {
    const event = isEdit ? editingEvent : newEvent;
    const setEvent = isEdit ? setEditingEvent : setNewEvent;

    return (
      <form onSubmit={isEdit ? handleEditEvent : handleCreateEvent}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
            Event Title *
          </label>
          <input
            type="text"
            value={event.title}
            onChange={(e) => setEvent({ ...event, title: e.target.value })}
            required
            placeholder="Family Reunion 2026"
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
            Description
          </label>
          <textarea
            value={event.description}
            onChange={(e) => setEvent({ ...event, description: e.target.value })}
            rows={4}
            placeholder="Describe the event..."
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
              Event Type *
            </label>
            <select
              value={event.eventType}
              onChange={(e) => setEvent({ ...event, eventType: e.target.value })}
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
              <option value="Reunion">Reunion</option>
              <option value="Birthday">Birthday</option>
              <option value="Anniversary">Anniversary</option>
              <option value="Holiday">Holiday</option>
              <option value="Celebration">Celebration</option>
              <option value="Meeting">Meeting</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
              Location *
            </label>
            <input
              type="text"
              value={event.location}
              onChange={(e) => setEvent({ ...event, location: e.target.value })}
              required
              placeholder="Central Park, NY"
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={event.startDate}
              onChange={(e) => setEvent({ ...event, startDate: e.target.value })}
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
              End Date & Time
            </label>
            <input
              type="datetime-local"
              value={event.endDate}
              onChange={(e) => setEvent({ ...event, endDate: e.target.value })}
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={event.isVirtual}
              onChange={(e) => setEvent({ ...event, isVirtual: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ color: colors.body, fontWeight: '500' }}>
              Virtual Event (Online)
            </span>
          </label>
        </div>

        {event.isVirtual && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
              Virtual Meeting Link
            </label>
            <input
              type="url"
              value={event.virtualLink}
              onChange={(e) => setEvent({ ...event, virtualLink: e.target.value })}
              placeholder="https://meet.google.com/..."
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
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              if (isEdit) {
                setShowEditModal(false);
                setEditingEvent(null);
              } else {
                setShowCreateModal(false);
              }
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
            {isEdit ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </form>
    );
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

  return (
    <Layout selectedFamily={families.find(f => f._id === selectedFamilyId)}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 8px 0' }}>Family Events</h2>
            <p style={{ color: colors.muted, margin: 0 }}>Plan and manage family gatherings</p>
          </div>
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
            <FaPlus /> Create Event
          </button>
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

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : events.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
            {events.map((event) => {
              const userRSVP = getUserRSVP(event);
              const goingCount = event.attendees?.filter((a: any) => a.status === 'going').length || 0;
              const maybeCount = event.attendees?.filter((a: any) => a.status === 'maybe').length || 0;
              const notGoingCount = event.attendees?.filter((a: any) => a.status === 'not-going').length || 0;

              return (
                <div
                  key={event._id}
                  style={{
                    background: colors.cardBg,
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden'
                  }}
                >
                  {/* Event Header */}
                  <div style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accentGold} 100%)`,
                    padding: '20px',
                    color: 'white'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {event.eventType}
                      </div>
                      {event.isVirtual && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          background: 'rgba(255,255,255,0.2)',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          <FaVideo size={10} /> Virtual
                        </div>
                      )}
                    </div>
                    <h3 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>
                      {event.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', opacity: 0.9 }}>
                      <FaCalendar size={12} />
                      {new Date(event.startDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>

                  {/* Event Body */}
                  <div style={{ padding: '20px' }}>
                    {event.description && (
                      <p style={{ color: colors.body, fontSize: '14px', margin: '0 0 16px 0' }}>
                        {event.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <FaMapMarkerAlt size={14} color={colors.muted} />
                      <span style={{ color: colors.body, fontSize: '14px' }}>
                        {event.location}
                      </span>
                    </div>

                    {/* RSVP Status */}
                    <div style={{
                      padding: '12px',
                      background: colors.sectionBg,
                      borderRadius: '8px',
                      marginBottom: '16px'
                    }}>
                      <p style={{ fontSize: '12px', color: colors.muted, margin: '0 0 8px 0' }}>
                        RSVP Status
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleRSVP(event._id, 'going')}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: userRSVP === 'going' ? '#10B981' : colors.cardBg,
                            color: userRSVP === 'going' ? 'white' : colors.body,
                            border: `1px solid ${userRSVP === 'going' ? '#10B981' : colors.border}`,
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <FaCheckCircle size={12} /> Going ({goingCount})
                        </button>
                        <button
                          onClick={() => handleRSVP(event._id, 'maybe')}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: userRSVP === 'maybe' ? '#F59E0B' : colors.cardBg,
                            color: userRSVP === 'maybe' ? 'white' : colors.body,
                            border: `1px solid ${userRSVP === 'maybe' ? '#F59E0B' : colors.border}`,
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <FaQuestionCircle size={12} /> Maybe ({maybeCount})
                        </button>
                        <button
                          onClick={() => handleRSVP(event._id, 'not-going')}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: userRSVP === 'not-going' ? '#DC2626' : colors.cardBg,
                            color: userRSVP === 'not-going' ? 'white' : colors.body,
                            border: `1px solid ${userRSVP === 'not-going' ? '#DC2626' : colors.border}`,
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <FaTimes size={12} /> Can't Go ({notGoingCount})
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {event.isVirtual && event.virtualLink && (
                        <button
                          onClick={() => window.open(event.virtualLink, '_blank')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: colors.accentGold,
                            color: 'white',
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
                          <FaVideo /> Join Meeting
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(event)}
                        style={{
                          padding: '10px 16px',
                          background: colors.primarySoft,
                          color: colors.primary,
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        style={{
                          padding: '10px 16px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: colors.cardBg,
            padding: '60px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📅</div>
            <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
              No events yet
            </h3>
            <p style={{ color: colors.muted, margin: 0 }}>
              Create your first family event using the "Create Event" button above
            </p>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
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
                Create New Event
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
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
            {renderEventForm(false)}
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
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
                Edit Event
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
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
            {renderEventForm(true)}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Events;
