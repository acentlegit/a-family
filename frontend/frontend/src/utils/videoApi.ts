import { API_URL } from '../config/api';

const API_BASE = API_URL.replace(/\/api\/?$/, '');

export async function getVideoToken(roomName: string, participantName: string) {
  const response = await fetch(`${API_URL}/livekit/token/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, participantName }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Failed to get token');
  }
  return response.json();
}

/** OpenAPI Video Service: POST /api/video/session (domain, userId, sessionId required) */
export async function createVideoSession(params: {
  domain: string;
  userId: string;
  sessionId: string;
  participantName?: string;
  metadata?: Record<string, unknown>;
}) {
  const url = `${API_URL}/video/session`;
  if (!url.startsWith('http')) {
    throw new Error('API not configured. Set REACT_APP_API_URL in .env');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
    body: JSON.stringify(params),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = json.error?.message || json.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return (json.data ?? json) as { token: string; url: string; roomName: string };
}

export default {
  post: async (url: string, data?: any) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify(data),
    });
    return { data: await response.json() };
  },
  get: async (url: string) => {
    const response = await fetch(`${API_URL}${url}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    });
    return { data: await response.json() };
  },
};
