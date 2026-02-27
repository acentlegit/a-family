import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api, { getApiUrl } from '../config/api';
import { colors } from '../styles/colors';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const Messages: React.FC = () => {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (familyId) {
      fetchMessages();
      setupSocket();
    } else {
      fetchFirstFamily();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [familyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchFirstFamily = async () => {
    try {
      const response = await api.get('/families');
      const families = response.data.data || [];
      if (families.length > 0) {
        navigate(`/messages/${families[0]._id}`);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/messages/family/${familyId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    if (!token || !familyId) return;

    // Get base URL without /api
    const apiUrl = getApiUrl();
    const baseUrl = apiUrl.replace('/api', '');
    
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    const socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join-family', familyId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('message-received', (message) => {
      console.log('Message received:', message);
      setMessages((prev) => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
    });

    socketRef.current = socket;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !familyId) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      const response = await api.post('/messages', {
        familyId,
        content: messageContent,
      });
      
      if (response.data.success && response.data.message) {
        // Message will be added via socket event, but add it here too in case socket is slow
        setMessages((prev) => {
          const exists = prev.some(m => m._id === response.data.message._id);
          if (exists) return prev;
          return [...prev, response.data.message];
        });
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      setNewMessage(messageContent); // Restore message on error
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send message';
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
      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: colors.title,
          marginBottom: '32px'
        }}>
          Message Board
        </h1>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: '600px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: colors.muted,
                padding: '40px'
              }}>
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message._id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
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
                    fontSize: '16px',
                    flexShrink: 0
                  }}>
                    {message.user?.firstName?.[0] || 'U'}
                    {message.user?.lastName?.[0] || ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        fontWeight: '600',
                        color: colors.title,
                        fontSize: '15px'
                      }}>
                        {message.user?.firstName} {message.user?.lastName}
                      </span>
                      <span style={{
                        color: colors.muted,
                        fontSize: '12px'
                      }}>
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{
                      color: colors.body,
                      fontSize: '15px',
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            style={{
              borderTop: `1px solid ${colors.border}`,
              padding: '20px',
              display: 'flex',
              gap: '12px'
            }}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: '12px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
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
              Send
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
