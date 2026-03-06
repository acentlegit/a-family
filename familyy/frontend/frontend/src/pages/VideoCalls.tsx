import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { FaVideo, FaUsers } from 'react-icons/fa';
import { FiCopy } from 'react-icons/fi';
import MeetingRoomLiveKit from '../components/MeetingRoomLiveKit';
import { getVideoToken, createVideoSession } from '../utils/videoApi';
import { API_URL } from '../config/api';

const VideoCalls: React.FC = () => {
  const { user } = useAuth();
  const [inMeeting, setInMeeting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [meetingRoom, setMeetingRoom] = useState('');
  const [meetingDomain, setMeetingDomain] = useState<string | undefined>();
  const [meetingUserId, setMeetingUserId] = useState<string | undefined>();
  const [joinLink, setJoinLink] = useState('');
  const [roomName, setRoomName] = useState(''); // Room name input
  const [displayName, setDisplayName] = useState('');

  // Set display name from user
  useEffect(() => {
    if (user) {
      const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
      setDisplayName(name);
    }
  }, [user]);

  // Pre-fill room name from URL parameters (but don't auto-join)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const livekitParam = params.get('livekit');
    
    if (roomParam || livekitParam) {
      const roomToJoin = livekitParam || roomParam;
      if (roomToJoin) {
        // Pre-fill the room name field instead of auto-joining
        setRoomName(roomToJoin);
        // Clear the URL parameter to prevent re-triggering
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  const handleJoinRoom = async (roomNameToJoin: string) => {
    if (!user) {
      setError('Please login to join a meeting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure display name is set - use current state or fallback to user info
      const participantName = displayName || `${user.firstName} ${user.lastName}`.trim() || user.email;
      
      // Update display name if it wasn't set
      if (!displayName && user) {
        const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
        setDisplayName(name);
      }
      
      const data = await getVideoToken(roomNameToJoin, participantName);
      setToken(data.token);
      setServerUrl(data.url);
      setMeetingRoom(data.roomName || roomNameToJoin);
      setMeetingDomain(undefined);
      setMeetingUserId(undefined);
      setInMeeting(true);
    } catch (err: any) {
      const msg = err.message || 'Failed to join meeting';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!user) {
      setError('Please login to create a meeting');
      return;
    }

    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use domain=personal
      const domain = 'personal';
      const userId = user.id || user.email;
      const sessionId = roomName.trim();
      const participantName = displayName || `${user.firstName} ${user.lastName}`.trim() || user.email;

      const data = await createVideoSession({
        domain,
        userId,
        sessionId,
        participantName,
      });

      setToken(data.token);
      setServerUrl(data.url);
      setMeetingRoom(data.roomName);
      setMeetingDomain(domain);
      setMeetingUserId(userId);
      setInMeeting(true);

      // Generate invite link
      const baseUrl = window.location.origin;
      const inviteLink = `${baseUrl}/video-calls?room=${encodeURIComponent(data.roomName)}`;
      setJoinLink(inviteLink);
    } catch (err: any) {
      const msg = err.message || 'Failed to create meeting';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    await handleJoinRoom(roomName.trim());
  };

  const leaveMeeting = () => {
    setInMeeting(false);
    setToken('');
    setServerUrl('');
    setMeetingRoom('');
    setMeetingDomain(undefined);
    setMeetingUserId(undefined);
    setJoinLink('');
    setRoomName('');
  };

  const copyInviteLink = () => {
    if (joinLink) {
      navigator.clipboard.writeText(joinLink).then(() => {
        alert('Invite link copied to clipboard!');
      }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = joinLink;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Invite link copied to clipboard!');
      });
    }
  };

  if (inMeeting && token && serverUrl && meetingRoom) {
    return (
      <MeetingRoomLiveKit
        roomName={meetingRoom}
        displayName={displayName}
        token={token}
        serverUrl={serverUrl}
        onClose={leaveMeeting}
        domain={meetingDomain}
        userId={meetingUserId}
      />
    );
  }

  return (
    <Layout>
      <div>
        <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 24px 0' }}>
          Video Calls
        </h2>

        {error && (
          <div style={{
            padding: '16px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {!user ? (
          <div style={{
            background: colors.cardBg,
            padding: '32px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center'
          }}>
            <p style={{ color: colors.muted, fontSize: '16px', margin: '0 0 20px 0' }}>
              Please login to use video calls
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '24px'
          }}>
            {/* Host: Create Meeting */}
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
                <FaVideo size={28} color={colors.primary} />
              </div>
              <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
                Create Meeting (Host)
              </h3>
              <p style={{ color: colors.muted, fontSize: '14px', margin: '0 0 20px 0' }}>
                Start a new video call. Only you (host) can create rooms.
              </p>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: colors.title, fontSize: '14px', marginBottom: '8px' }}>
                  Room Name
                </label>
                <input
                  type="text"
                  placeholder="Enter room name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    background: colors.sectionBg,
                    color: colors.title
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: colors.title, fontSize: '14px', marginBottom: '8px' }}>
                  Your Name (Host)
                </label>
                <input
                  type="text"
                  placeholder={displayName}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    background: colors.sectionBg,
                    color: colors.title
                  }}
                />
              </div>
              <button
                onClick={handleCreateMeeting}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: loading ? colors.muted : colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <FaVideo size={16} />
                {loading ? 'Creating...' : 'Create Meeting'}
              </button>
              {joinLink && (
                <div style={{ marginTop: '16px', padding: '12px', background: colors.sectionBg, borderRadius: '8px' }}>
                  <p style={{ color: colors.title, fontSize: '12px', margin: '0 0 8px 0', fontWeight: '600' }}>
                    Invite Link:
                  </p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={joinLink}
                      readOnly
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        fontSize: '13px',
                        background: colors.cardBg,
                        color: colors.title
                      }}
                    />
                    <button
                      onClick={copyInviteLink}
                      style={{
                        padding: '8px 12px',
                        background: colors.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FiCopy size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Join Meeting */}
            <div style={{
              background: colors.cardBg,
              padding: '32px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: colors.accentSoft,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <FaUsers size={28} color={colors.accentGold} />
              </div>
              <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
                Join Meeting
              </h3>
              <p style={{ color: colors.muted, fontSize: '14px', margin: '0 0 20px 0' }}>
                Enter room name or use invite link to join
              </p>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: colors.title, fontSize: '14px', marginBottom: '8px' }}>
                  Room Name
                </label>
                <input
                  type="text"
                  placeholder="Enter room name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    background: colors.sectionBg,
                    color: colors.title
                  }}
                />
              </div>
              <button
                onClick={handleJoinWithCode}
                disabled={loading || !roomName.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: loading || !roomName.trim() ? colors.muted : colors.accentGold,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: loading || !roomName.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <FaUsers size={16} />
                {loading ? 'Joining...' : 'Join Meeting'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VideoCalls;
