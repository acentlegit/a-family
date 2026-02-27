import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { 
  LiveKitRoom, 
  useParticipants, 
  useLocalParticipant,
  RoomAudioRenderer,
  ControlBar,
  VideoTrack,
  AudioTrack,
  useDataChannel
} from '@livekit/components-react';
import '@livekit/components-styles';
import api from '../utils/videoApi';
import { Track, type Participant, type TrackPublication } from 'livekit-client';

export interface MeetingRoomLiveKitProps {
  roomName: string;
  displayName: string;
  token: string;
  serverUrl: string;
  onClose: () => void;
  domain?: string;
  userId?: string;
}

function RoomControls({
  roomName,
  inviteLink,
  meetingId,
  baseUrl,
  onClose,
  showChat,
  setShowChat,
  showNotes,
  setShowNotes,
  domain,
  userId,
}: {
  roomName: string;
  inviteLink: string;
  meetingId: string;
  baseUrl: string;
  onClose: () => void;
  showChat: boolean;
  setShowChat: (v: boolean) => void;
  showNotes: boolean;
  setShowNotes: (v: boolean) => void;
  domain?: string;
  userId?: string;
}) {
  const [recording, setRecording] = useState<'idle' | 'starting' | 'active' | 'stopping'>('idle');
  const [egressId, setEgressId] = useState<string | null>(null);
  const [breakoutRooms, setBreakoutRooms] = useState<Array<{ name: string; joinUrl: string }>>([]);
  const [showBreakout, setShowBreakout] = useState(false);
  const [breakoutCount, setBreakoutCount] = useState(2);
  const [creatingBreakout, setCreatingBreakout] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Array<{ identity: string; name: string }>>([]);
  const [moveParticipantIdentity, setMoveParticipantIdentity] = useState('');
  const [moveDestinationRoom, setMoveDestinationRoom] = useState('');
  const [moving, setMoving] = useState(false);
  const [moveFeedback, setMoveFeedback] = useState<string | null>(null);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createdRoomLink, setCreatedRoomLink] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  const copyToClipboard = useCallback((text: string, label: string) => {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopyFeedback(label);
        setTimeout(() => setCopyFeedback(null), 2000);
      }).catch(() => {
        // Fallback if clipboard API fails
        fallbackCopy(text, label);
      });
    } else {
      // Use fallback for HTTP
      fallbackCopy(text, label);
    }
  }, []);

  const fallbackCopy = (text: string, label: string) => {
    // Create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setCopyFeedback('failed');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
    textarea.remove();
  };

  const startRecording = useCallback(async () => {
    if (recording !== 'idle') return;
    setRecording('starting');
    try {
      const { data } = await api.post(`/livekit/rooms/${encodeURIComponent(roomName)}/recording/start`, {
        domain: domain || undefined,
        userId: userId || undefined,
      });
      setEgressId(data.egressId);
      setRecording('active');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to start recording';
      alert(msg);
      setRecording('idle');
    }
  }, [roomName, domain, userId, recording]);

  const stopRecording = useCallback(async () => {
    if (recording !== 'active' || !egressId) return;
    setRecording('stopping');
    try {
      await api.post('/livekit/recording/stop', { egressId });
      setEgressId(null);
      setRecording('idle');
    } catch (e: unknown) {
      alert((e as Error).message || 'Failed to stop recording');
    } finally {
      setRecording('idle');
    }
  }, [egressId, recording]);

  const createBreakoutRooms = useCallback(async () => {
    setCreatingBreakout(true);
    try {
      const { data } = await api.post(`/livekit/rooms/${encodeURIComponent(roomName)}/breakout`, { count: breakoutCount });
      setBreakoutRooms(data.rooms || []);
      setShowBreakout(true);
    } catch (e: unknown) {
      alert((e as Error).message || 'Failed to create breakout rooms');
    } finally {
      setCreatingBreakout(false);
    }
  }, [roomName, breakoutCount]);

  const loadBreakoutList = useCallback(async () => {
    try {
      const { data } = await api.get(`/livekit/rooms/${encodeURIComponent(roomName)}/breakout`);
      setBreakoutRooms(data.rooms || []);
      setShowBreakout(true);
    } catch {
      setBreakoutRooms([]);
      setShowBreakout(true);
    }
  }, [roomName]);

  const loadParticipants = useCallback(async () => {
    try {
      const { data } = await api.get(`/livekit/rooms/${encodeURIComponent(roomName)}/participants`);
      setParticipants(data.participants || []);
    } catch {
      setParticipants([]);
    }
  }, [roomName]);

  const moveToBreakout = useCallback(async () => {
    if (!moveParticipantIdentity || !moveDestinationRoom) return;
    setMoving(true);
    setMoveFeedback(null);
    try {
      await api.post(`/livekit/rooms/${encodeURIComponent(roomName)}/breakout/move`, {
        participantIdentity: moveParticipantIdentity,
        destinationRoomName: moveDestinationRoom,
      });
      setMoveFeedback('Moved');
      setMoveParticipantIdentity('');
      setMoveDestinationRoom('');
      loadParticipants();
    } catch (e: unknown) {
      setMoveFeedback((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Move failed');
    } finally {
      setMoving(false);
    }
  }, [roomName, moveParticipantIdentity, moveDestinationRoom, loadParticipants]);

  const createRoom = useCallback(async () => {
    const name = newRoomName.trim();
    if (!name) return;
    setCreatingRoom(true);
    setCreatedRoomLink(null);
    try {
      await api.post('/livekit/rooms', { name });
      const joinUrl = `${baseUrl}/join?livekit=${encodeURIComponent(name)}`;
      setCreatedRoomLink(joinUrl);
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  }, [baseUrl, newRoomName]);

  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-5 py-2.5 bg-slate-950/98 backdrop-blur-xl border-b-2 border-slate-800/80 text-white pointer-events-auto shadow-2xl">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm truncate max-w-[140px]" title={roomName}>
          {roomName}
        </span>
        <span className="text-brand-muted text-xs hidden sm:inline">ID: {meetingId}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Chat button */}
        <button
          type="button"
          onClick={() => { setShowChat(!showChat); setShowNotes(false); setShowMembers(false); setShowInvitePanel(false); setShowCreateRoom(false); setShowBreakout(false); }}
          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 cursor-pointer ${showChat ? 'bg-blue-600 text-white' : 'bg-white/20 hover:bg-white/30'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </button>
        {/* Notes button */}
        <button
          type="button"
          onClick={() => { setShowNotes(!showNotes); setShowChat(false); setShowMembers(false); setShowInvitePanel(false); setShowCreateRoom(false); setShowBreakout(false); }}
          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 cursor-pointer ${showNotes ? 'bg-blue-600 text-white' : 'bg-white/20 hover:bg-white/30'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Notes
        </button>
        {/* Members button */}
        <button
          type="button"
          onClick={() => { setShowMembers((v) => !v); setShowChat(false); setShowNotes(false); setShowInvitePanel(false); setShowCreateRoom(false); setShowBreakout(false); }}
          className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm flex items-center gap-1 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Members
        </button>
        {/* Invite */}
        <button
          type="button"
          onClick={() => { setShowInvitePanel((v) => !v); setShowCreateRoom(false); setShowMembers(false); setShowChat(false); setShowNotes(false); }}
          className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm cursor-pointer"
        >
          + Invite
        </button>
        {/* Create room */}
        <button
          type="button"
          onClick={() => { setShowCreateRoom((v) => !v); setShowInvitePanel(false); setShowMembers(false); setShowChat(false); setShowNotes(false); }}
          className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm cursor-pointer"
        >
          Create room
        </button>
        {/* Recording */}
        {recording === 'idle' && (
          <button type="button" onClick={startRecording} className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-sm cursor-pointer">
            Start recording
          </button>
        )}
        {recording === 'starting' && <span className="text-sm text-brand-muted">Startingâ€¦</span>}
        {recording === 'active' && (
          <button type="button" onClick={stopRecording} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-sm flex items-center gap-1 cursor-pointer">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Stop recording
          </button>
        )}
        {recording === 'stopping' && <span className="text-sm text-brand-muted">Stoppingâ€¦</span>}
        {/* Breakout rooms */}
        {!showBreakout ? (
          <>
            <button
              type="button"
              onClick={createBreakoutRooms}
              disabled={creatingBreakout}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm disabled:opacity-50 cursor-pointer"
            >
              {creatingBreakout ? 'Creatingâ€¦' : 'Create breakout rooms'}
            </button>
            <button type="button" onClick={() => { loadBreakoutList(); setShowMembers(false); setShowInvitePanel(false); setShowCreateRoom(false); }} className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm cursor-pointer">
              Show breakouts
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setShowBreakout(false)} className="px-3 py-1.5 rounded-lg bg-white/20 text-sm cursor-pointer">
            Hide breakouts
          </button>
        )}
        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-sm cursor-pointer">
          Leave
        </button>
      </div>

      {/* Members panel - compact sidebar style */}
      {showMembers && (
        <div className="absolute top-full right-4 mt-1 w-64 max-h-72 overflow-auto rounded-lg bg-gray-900 border border-gray-700 shadow-xl p-3 z-50 pointer-events-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">Members ({participants.length})</span>
            <button type="button" onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-white">Ã—</button>
          </div>
          {participants.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-2">No participants yet</p>
              <button
                type="button"
                onClick={loadParticipants}
                className="px-3 py-1.5 rounded bg-white/20 hover:bg-white/30 text-xs"
              >
                Refresh
              </button>
            </div>
          ) : (
            <>
              <ul className="space-y-2 mb-3">
                {participants.map((p) => (
                  <li key={p.identity} className="flex items-center gap-2 p-2 rounded bg-gray-800 hover:bg-gray-750">
                    <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-sm font-semibold">
                      {(p.name || p.identity).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name || p.identity}</p>
                      <p className="text-xs text-gray-400 truncate">{p.identity}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={loadParticipants}
                className="w-full px-3 py-1.5 rounded bg-white/20 hover:bg-white/30 text-xs"
              >
                Refresh members
              </button>
            </>
          )}
        </div>
      )}

      {/* Invite panel â€“ join link as hyperlink */}
      {showInvitePanel && (
        <div className="absolute top-full left-4 mt-1 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-900 border border-gray-700 shadow-xl p-3 z-50 pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Invite people</span>
            <button type="button" onClick={() => setShowInvitePanel(false)} className="text-gray-400 hover:text-white">Ã—</button>
          </div>
          <p className="text-xs text-gray-400 mb-1">Join link (click to open in new tab):</p>
          <a
            href={inviteLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-blue-300 hover:text-blue-200 underline break-all mb-2"
          >
            {inviteLink}
          </a>
          
          {/* Manual copy input for link */}
          <div className="mb-3">
            <input
              type="text"
              value={inviteLink}
              readOnly
              onClick={(e) => e.currentTarget.select()}
              className="w-full px-2 py-1.5 rounded bg-gray-800 text-white text-xs border border-gray-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <button
              type="button"
              onClick={() => copyToClipboard(inviteLink, 'link')}
              className="px-3 py-1.5 rounded bg-white/20 hover:bg-white/30 text-xs cursor-pointer"
            >
              {copyFeedback === 'link' ? 'âœ“ Copied!' : copyFeedback === 'failed' ? 'Select & copy' : 'Copy link'}
            </button>
            <span className="text-gray-500 text-xs">Meeting ID: <strong className="text-gray-300">{meetingId}</strong></span>
          </div>

          {/* Manual copy input for ID */}
          <div className="mt-2">
            <input
              type="text"
              value={meetingId}
              readOnly
              onClick={(e) => e.currentTarget.select()}
              className="w-full px-2 py-1.5 rounded bg-gray-800 text-white text-xs border border-gray-600 focus:border-blue-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(meetingId, 'id')}
              className="mt-1 px-3 py-1.5 rounded bg-white/20 hover:bg-white/30 text-xs cursor-pointer"
            >
              {copyFeedback === 'id' ? 'âœ“ Copied!' : copyFeedback === 'failed' ? 'Select & copy' : 'Copy ID'}
            </button>
          </div>
        </div>
      )}

      {/* Create room panel */}
      {showCreateRoom && (
        <div className="absolute top-full left-4 mt-1 w-96 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-900 border border-gray-700 shadow-xl p-3 z-50 pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Create room</span>
            <button type="button" onClick={() => { setShowCreateRoom(false); setCreatedRoomLink(null); setNewRoomName(''); }} className="text-gray-400 hover:text-white">Ã—</button>
          </div>
          {!createdRoomLink ? (
            <>
              <input
                type="text"
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white text-sm mb-2"
              />
              <button
                type="button"
                onClick={createRoom}
                disabled={creatingRoom || !newRoomName.trim()}
                className="px-4 py-2 rounded bg-brand-primary text-white text-sm disabled:opacity-50 cursor-pointer"
              >
                {creatingRoom ? 'Creatingâ€¦' : 'Create'}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-1">Room created. Open join link:</p>
              <a
                href={createdRoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-300 hover:text-blue-200 underline break-all mb-2"
              >
                {createdRoomLink}
              </a>
              {/* Manual copy input */}
              <input
                type="text"
                value={createdRoomLink}
                readOnly
                onClick={(e) => e.currentTarget.select()}
                className="w-full px-2 py-1.5 rounded bg-gray-800 text-white text-xs border border-gray-600 focus:border-blue-400 focus:outline-none mb-2"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(createdRoomLink, 'newroom')}
                className="px-3 py-1.5 rounded bg-white/20 hover:bg-white/30 text-xs cursor-pointer"
              >
                {copyFeedback === 'newroom' ? 'âœ“ Copied!' : copyFeedback === 'failed' ? 'Select & copy' : 'Copy link'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Breakout modal / panel */}
      {showBreakout && (
        <div className="absolute top-full right-4 mt-1 w-80 max-h-64 overflow-auto rounded-lg bg-gray-900 border border-gray-700 shadow-xl p-3 z-20">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Breakout rooms</span>
            <button type="button" onClick={() => setShowBreakout(false)} className="text-gray-400 hover:text-white">
              Ã—
            </button>
          </div>
          {breakoutRooms.length === 0 ? (
            <p className="text-sm text-gray-400">No breakout rooms yet. Create some above.</p>
          ) : (
            <ul className="space-y-2">
              {breakoutRooms.map((r) => (
                <li key={r.name} className="flex items-center gap-2 text-sm flex-wrap bg-gray-800 p-2 rounded">
                  <span className="truncate text-gray-300 flex-1 min-w-0">{r.name}</span>
                  <a
                    href={r.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-blue-300 hover:text-blue-200 underline text-xs"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(r.joinUrl, r.name)}
                    className="shrink-0 px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-xs cursor-pointer"
                  >
                    {copyFeedback === r.name ? 'âœ“' : 'Copy'}
                  </button>
                  {/* Manual copy input - shown on click */}
                  <input
                    type="text"
                    value={r.joinUrl}
                    readOnly
                    onClick={(e) => e.currentTarget.select()}
                    className="w-full px-2 py-1 rounded bg-gray-700 text-white text-xs border border-gray-600 focus:border-blue-400 focus:outline-none mt-1"
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Move to breakout */}
          {breakoutRooms.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-700 space-y-2">
              <span className="text-xs font-medium text-gray-400">Move to breakout</span>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={moveParticipantIdentity}
                  onChange={(e) => setMoveParticipantIdentity(e.target.value)}
                  onFocus={loadParticipants}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded bg-gray-800 text-white text-sm"
                >
                  <option value="">Select participant</option>
                  {participants.map((p) => (
                    <option key={p.identity} value={p.identity}>
                      {p.name || p.identity}
                    </option>
                  ))}
                </select>
                <select
                  value={moveDestinationRoom}
                  onChange={(e) => setMoveDestinationRoom(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded bg-gray-800 text-white text-sm"
                >
                  <option value="">Select room</option>
                  {breakoutRooms.map((r) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={moveToBreakout}
                  disabled={moving || !moveParticipantIdentity || !moveDestinationRoom}
                  className="px-3 py-1.5 rounded bg-brand-primary text-white text-sm disabled:opacity-50"
                >
                  {moving ? 'Movingâ€¦' : 'Move'}
                </button>
              </div>
              {moveFeedback && (
                <p className={`text-xs ${moveFeedback === 'Moved' ? 'text-green-400' : 'text-red-400'}`}>
                  {moveFeedback}
                </p>
              )}
              <button type="button" onClick={loadParticipants} className="text-xs text-gray-400 hover:text-white">
                Refresh participants
              </button>
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-gray-700 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={20}
              value={breakoutCount}
              onChange={(e) => setBreakoutCount(Number(e.target.value) || 2)}
              className="w-14 px-2 py-1 rounded bg-gray-800 text-white text-sm"
            />
            <button
              type="button"
              onClick={createBreakoutRooms}
              disabled={creatingBreakout}
              className="px-2 py-1 rounded bg-brand-primary text-white text-sm"
            >
              Add rooms
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Chat message type for our real-time data channel
interface ChatMessageEntry {
  id: string;
  senderName: string;
  message: string;
  timestamp: number;
  isOwn?: boolean;
}

const CHAT_TOPIC = 'room-chat';

// Chat panel - ALWAYS mounted (visibility toggled) so useDataChannel receives messages from others
function ChatPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const [messages, setMessages] = useState<ChatMessageEntry[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const onMessage = useCallback((msg: { payload: Uint8Array }) => {
    try {
      const decoded = JSON.parse(new TextDecoder().decode(msg.payload)) as {
        id: string;
        senderName: string;
        message: string;
        timestamp: number;
      };
      if (!decoded.id || !decoded.message) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === decoded.id)) return prev;
        return [...prev, decoded];
      });
    } catch {
      // ignore malformed messages
    }
  }, []);

  const { send, isSending } = useDataChannel(CHAT_TOPIC, onMessage);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    const payload: Omit<ChatMessageEntry, 'isOwn'> = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      senderName: localParticipant?.name || localParticipant?.identity || 'You',
      message: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, { ...payload, isOwn: true }]);
    setInput('');
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    await send(encoded, { reliable: true });
  };

  if (!visible) {
    return <div className="hidden" aria-hidden="true" />;
  }

  return (
    <div className="absolute top-12 left-4 bottom-24 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-900 border border-gray-700 shadow-xl flex flex-col z-40 pointer-events-auto">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-sm">Chat (real-time)</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">Ã—</button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="text-blue-300 font-medium">{msg.senderName}:</span>
              <span className="text-gray-200 ml-1">{msg.message}</span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="p-3 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded bg-gray-800 text-white text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// Notes panel - auto-generates meeting notes (participant join/leave, etc.)
function NotesPanel({
  onClose,
  roomName,
}: {
  onClose: () => void;
  roomName: string;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [notes, setNotes] = useState<Array<{ id: string; time: string; text: string; type: 'auto' | 'manual' }>>([]);
  const [manualNote, setManualNote] = useState('');
  const prevIdsRef = useRef<Set<string>>(new Set());
  const namesRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  const timeStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (!initializedRef.current) {
      setNotes([{ id: '0', time: timeStr(), text: `Meeting started - ${roomName}`, type: 'auto' }]);
      initializedRef.current = true;
    }
  }, [roomName]);

  useEffect(() => {
    const currentIds = new Set<string>();
    participants.forEach((p) => {
      currentIds.add(p.identity);
      namesRef.current.set(p.identity, p.name || p.identity);
      if (!prevIdsRef.current.has(p.identity)) {
        const name = p.name || p.identity;
        const isYou = p.identity === localParticipant?.identity;
        setNotes((n) => [
          ...n,
          { id: `${Date.now()}-${p.identity}`, time: timeStr(), text: `${name} ${isYou ? '(You) ' : ''}joined`, type: 'auto' },
        ]);
      }
    });
    prevIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        const name = namesRef.current.get(id) || id;
        setNotes((n) => [...n, { id: `${Date.now()}-${id}`, time: timeStr(), text: `${name} left`, type: 'auto' }]);
      }
    });
    prevIdsRef.current = currentIds;
  }, [participants, localParticipant?.identity]);

  const addManualNote = () => {
    const text = manualNote.trim();
    if (!text) return;
    setNotes((n) => [...n, { id: `${Date.now()}`, time: timeStr(), text, type: 'manual' }]);
    setManualNote('');
  };

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [notes]);

  return (
    <div className="absolute top-12 left-4 bottom-24 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-900 border border-gray-700 shadow-xl flex flex-col z-40 pointer-events-auto">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-sm">Meeting Notes (auto)</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">Ã—</button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px]">
        {notes.map((n) => (
          <div key={n.id} className="text-sm">
            <span className="text-gray-500 text-xs mr-2">{n.time}</span>
            <span className={n.type === 'auto' ? 'text-gray-300' : 'text-white'}>{n.text}</span>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={manualNote}
          onChange={(e) => setManualNote(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 px-3 py-2 rounded bg-gray-800 text-white text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && addManualNote()}
        />
        <button
          type="button"
          onClick={addManualNote}
          disabled={!manualNote.trim()}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// Participant tile - defined outside VideoGrid and memoized to avoid remount blinks
const ParticipantTile = memo(function ParticipantTile({
  participant,
  localParticipant,
  isMain = false,
  onClick,
}: {
  participant: Participant;
  localParticipant: Participant | undefined;
  isMain?: boolean;
  onClick?: () => void;
}) {
  const vidPubs = Array.from(participant.videoTrackPublications.values());
  const screenPub = vidPubs.find((p) => p.source === Track.Source.ScreenShare && p.track);
  const camPub = vidPubs.find((p) => p.source === Track.Source.Camera && p.track);
  const audioPub = participant.audioTrackPublications.values().next().value;
  const isLocal = participant.identity === localParticipant?.identity;
  const trackToShow = screenPub || camPub;
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Manual video track attachment - more reliable for local participant
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const track = trackToShow?.track;
    
    if (track) {
      // For local participant, use manual MediaStream attachment
      if (isLocal) {
        if (track.mediaStreamTrack) {
          const stream = new MediaStream([track.mediaStreamTrack]);
          videoEl.srcObject = stream;
          videoEl.play().catch((err) => {
            console.error('Error playing local video:', err);
          });
        }
      } else {
        // For remote participants, use LiveKit's attach method
        track.attach(videoEl);
      }
    } else {
      // No track - clear video
      videoEl.srcObject = null;
    }

    return () => {
      if (videoEl) {
        videoEl.srcObject = null;
      }
      if (track && !isLocal) {
        track.detach();
      }
    };
  }, [trackToShow?.track, isLocal, trackToShow?.track?.mediaStreamTrack, camPub?.track]);
  
  // Listen for track subscription events for local participant
  useEffect(() => {
    if (!isLocal || !camPub) return;
    
    const handleTrackSubscribed = (track: any) => {
      if (track.kind === 'video' && videoRef.current && track.mediaStreamTrack) {
        const stream = new MediaStream([track.mediaStreamTrack]);
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    };
    
    // Subscribe to track if it becomes available
    if (camPub.track && videoRef.current && !videoRef.current.srcObject) {
      handleTrackSubscribed(camPub.track);
    }
    
    // Listen for track subscription
    camPub.on?.('subscribed', handleTrackSubscribed);
    
    return () => {
      camPub.off?.('subscribed', handleTrackSubscribed);
    };
  }, [isLocal, camPub]);
  
  // Debug logging for local participant
  useEffect(() => {
    if (isLocal) {
      console.log('📹 Local participant video state:', {
        hasTrack: !!camPub?.track,
        hasPublication: !!camPub,
        isCameraEnabled: participant.isCameraEnabled,
        trackMuted: camPub?.track?.isMuted,
        mediaStreamTrack: !!camPub?.track?.mediaStreamTrack,
        trackSource: camPub?.source,
        allVideoPubs: vidPubs.map(p => ({ source: p.source, hasTrack: !!p.track })),
        videoElement: !!videoRef.current,
        srcObject: !!videoRef.current?.srcObject,
      });
      
      // Force re-attach if needed
      if (camPub?.track?.mediaStreamTrack && videoRef.current && !videoRef.current.srcObject) {
        const stream = new MediaStream([camPub.track.mediaStreamTrack]);
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [isLocal, camPub, participant.isCameraEnabled, vidPubs]);

  return (
    <div
      className={`relative bg-slate-900 rounded-xl overflow-hidden border-2 ${isMain ? 'w-full h-full border-slate-700' : 'aspect-video border-slate-800 min-h-[240px]'} ${onClick ? 'cursor-pointer hover:border-yellow-400 hover:shadow-xl transition-all duration-200' : ''}`}
      onClick={onClick}
    >
      {trackToShow?.track ? (
        isLocal ? (
          // Manual video element for local participant - more reliable
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          // LiveKit VideoTrack for remote participants
          // @ts-ignore - LiveKit component type issue
          <VideoTrack
            trackRef={{
              participant,
              source: trackToShow.source,
              publication: trackToShow,
            }}
            className="w-full h-full object-cover"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-4xl text-white font-bold shadow-xl transform rotate-3">
              {(participant.name || participant.identity).charAt(0).toUpperCase()}
            </div>
            <p className="text-white text-base mt-4 font-semibold">{participant.name || participant.identity}</p>
          </div>
        </div>
      )}
      {audioPub?.track && !isLocal && (
        // @ts-ignore - LiveKit component type issue
        <AudioTrack
          trackRef={{
            participant,
            source: Track.Source.Microphone,
            publication: audioPub,
          }}
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-slate-950/95 to-transparent text-white px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="truncate text-sm font-semibold">
            {participant.name || participant.identity}
            {isLocal && <span className="text-cyan-400 ml-2 font-normal">(You)</span>}
          </span>
          {screenPub && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md text-xs font-medium border border-amber-500/30">
              Sharing
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div 
            title={participant.isMicrophoneEnabled ? 'Microphone on' : 'Muted'} 
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${participant.isMicrophoneEnabled ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}
          >
            {participant.isMicrophoneEnabled ? '🎤' : '🔇'}
          </div>
          <div 
            title={participant.isCameraEnabled ? 'Camera on' : 'Camera off'} 
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${participant.isCameraEnabled ? 'bg-emerald-500/90 text-white' : 'bg-slate-700 text-white'}`}
          >
            📹
          </div>
        </div>
      </div>
    </div>
  );
});

// Zoom/Meet style: main video large, others in sidebar. Screen share takes priority.
function VideoGrid() {
  const remoteParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Combine local and remote participants for display
  const allParticipants = localParticipant 
    ? [localParticipant, ...remoteParticipants]
    : remoteParticipants;

  // Find screen share - takes priority for main view
  const hasScreenShare = (p: Participant) =>
    Array.from(p.videoTrackPublications.values()).some(
      (pub) => pub.source === Track.Source.ScreenShare && pub.track
    );
  const screenShareParticipant = allParticipants.find(hasScreenShare);

  // Prioritize: screen share > selected > remote > local (when alone, show local)
  const mainParticipant =
    screenShareParticipant ||
    allParticipants.find((p) => p.identity === selectedId) ||
    (remoteParticipants.length > 0 
      ? allParticipants.find((p) => p.identity !== localParticipant?.identity)
      : localParticipant) ||
    localParticipant ||
    allParticipants[0];

  // Always include local participant in others if they're not the main participant
  const others = allParticipants.filter((p) => p.identity !== mainParticipant?.identity);
  
  // Ensure local participant is always visible in sidebar (first position)
  const displayOthers = localParticipant && mainParticipant?.identity !== localParticipant.identity
    ? [localParticipant, ...others.filter(p => p.identity !== localParticipant.identity)]
    : others;

  if (allParticipants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 to-slate-950">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xl text-white font-medium mb-2">Connecting to room...</p>
          <p className="text-sm text-gray-400">Please wait while we establish the connection</p>
        </div>
      </div>
    );
  }

  const isLocalSharing = screenShareParticipant?.identity === localParticipant?.identity;
  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

  return (
    <div className="flex h-full gap-2 p-2 flex-col">
      {isLocalSharing && (
        <div className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-900/70 text-amber-200 text-xs">
          ðŸ’¡ Tip: Share a different window or app to avoid recursive view. Do not share this browser tab.
        </div>
      )}
      {!isSecureContext && (
        <div className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-orange-900/70 text-orange-200 text-xs">
          âš ï¸ Screen share requires HTTPS. Deploy with CloudFront or use HTTPS for full functionality.
        </div>
      )}
      {/* Modern grid layout: Main participant large, others in sidebar */}
      <div className="flex flex-1 min-h-0 gap-4 p-4">
        {/* Main participant - takes most of the space */}
        <div className="flex-1 min-w-0 relative rounded-2xl overflow-hidden shadow-2xl">
          {mainParticipant && (
            <div className="w-full h-full relative">
              <ParticipantTile
                participant={mainParticipant}
                localParticipant={localParticipant}
                isMain
              />
              {/* Active speaker indicator - yellow border */}
              {mainParticipant.identity === selectedId && (
                <div className="absolute inset-0 border-4 border-yellow-400 rounded-2xl pointer-events-none z-10 animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* Others grid - right sidebar - always show if there are participants */}
        {displayOthers.length > 0 && (
          <div className="w-[420px] flex-shrink-0 bg-slate-900/50 rounded-2xl p-4 backdrop-blur-sm border border-slate-800">
            {(() => {
              // For better visibility, use fewer columns and larger tiles
              const cols = displayOthers.length <= 2 ? 1 : displayOthers.length <= 4 ? 2 : 2;
              const rows = Math.ceil(Math.min(displayOthers.length, 6) / cols);
              return (
                <div 
                  className="grid gap-4 h-full"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                  }}
                >
                  {displayOthers.slice(0, cols * rows).map((p) => {
                    const isLocal = p.identity === localParticipant?.identity;
                    return (
                      <div 
                        key={p.identity} 
                        className={`relative rounded-xl overflow-hidden ${isLocal ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                      >
                        <ParticipantTile
                          participant={p}
                          localParticipant={localParticipant}
                          onClick={() => setSelectedId(p.identity === selectedId ? null : p.identity)}
                        />
                        {/* Highlight selected participant */}
                        {p.identity === selectedId && (
                          <div className="absolute inset-0 border-4 border-yellow-400 rounded-xl pointer-events-none z-10 animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MeetingRoomLiveKit({ roomName, displayName: _displayName, token, serverUrl, onClose, domain, userId }: MeetingRoomLiveKitProps) {
  const [showChat, setShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  
  // Ensure HTTPS for CloudFront deployment
  const getBaseUrl = (): string => {
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      if (origin.includes('cloudfront.net') || origin.includes('amazonaws.com')) {
        return origin.replace('http://', 'https://');
      }
      return origin;
    }
    // Fallback for SSR or when window is not available
    return process.env.REACT_APP_CLIENT_URL || 'http://localhost:3000';
  };

  const baseUrl = getBaseUrl();
  const inviteLink = `${baseUrl}/video-calls?room=${encodeURIComponent(roomName)}`;
  const meetingId = roomName.replace(/^meeting-/, '');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      <RoomControls
        roomName={roomName}
        inviteLink={inviteLink}
        meetingId={meetingId}
        baseUrl={baseUrl}
        onClose={onClose}
        showChat={showChat}
        setShowChat={setShowChat}
        showNotes={showNotes}
        setShowNotes={setShowNotes}
        domain={domain}
        userId={userId}
      />
      
      {/* @ts-ignore - LiveKit component type issue */}
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={true}
        video={true}
        onConnected={() => {
          console.log('âœ… Connected to LiveKit room:', roomName);
        }}
        onDisconnected={(reason) => {
          console.log('âŒ Disconnected from LiveKit room:', reason);
          onClose();
        }}
        onError={(error) => {
          console.error('âŒ LiveKit error:', error);
        }}
        style={{ height: '100%', width: '100%' }}
        options={{
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          },
        }}
      >
        <RoomAudioRenderer />
        <div className="flex-1 min-h-0 pt-14 relative">
          <ChatPanel visible={showChat} onClose={() => setShowChat(false)} />
          {showNotes && <NotesPanel roomName={roomName} onClose={() => setShowNotes(false)} />}
          <style>{`
            /* Custom scrollbar */
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(15, 23, 42, 0.5);
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(148, 163, 184, 0.5);
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(148, 163, 184, 0.7);
            }
            
            /* Modern LiveKit controls styling */
            .lk-control-bar {
              background: linear-gradient(to top, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.92) 100%) !important;
              backdrop-filter: blur(20px) !important;
              padding: 18px 28px !important;
              border-radius: 20px 20px 0 0 !important;
              border-top: 2px solid rgba(148, 163, 184, 0.2) !important;
              z-index: 40 !important;
              box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.6) !important;
            }
            
            .lk-button {
              background: rgba(148, 163, 184, 0.15) !important;
              backdrop-filter: blur(10px) !important;
              color: white !important;
              border: 1.5px solid rgba(148, 163, 184, 0.3) !important;
              width: 52px !important;
              height: 52px !important;
              border-radius: 14px !important;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              margin: 0 8px !important;
              cursor: pointer !important;
              pointer-events: auto !important;
            }
            
            .lk-button:hover {
              background: rgba(148, 163, 184, 0.25) !important;
              transform: translateY(-2px) scale(1.05) !important;
              box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4) !important;
              border-color: rgba(148, 163, 184, 0.5) !important;
            }
            
            .lk-button svg {
              width: 24px !important;
              height: 24px !important;
              stroke-width: 2.5 !important;
            }
            
            /* Muted/disabled states */
            .lk-button[data-lk-source="microphone"][aria-pressed="false"],
            .lk-button[data-lk-source="camera"][aria-pressed="false"] {
              background: rgba(239, 68, 68, 0.9) !important;
              color: white !important;
              border-color: rgba(239, 68, 68, 0.6) !important;
            }
            
            .lk-button[data-lk-source="microphone"][aria-pressed="false"]:hover,
            .lk-button[data-lk-source="camera"][aria-pressed="false"]:hover {
              background: rgba(220, 38, 38, 0.95) !important;
              transform: translateY(-2px) scale(1.08) !important;
            }
            
            /* Leave button */
            .lk-disconnect-button,
            button[aria-label*="leave"],
            button[aria-label*="disconnect"] {
              background: rgba(239, 68, 68, 0.9) !important;
              color: white !important;
              border: 1.5px solid rgba(239, 68, 68, 0.6) !important;
              width: 56px !important;
              height: 56px !important;
              border-radius: 14px !important;
            }
            
            .lk-disconnect-button:hover,
            button[aria-label*="leave"]:hover,
            button[aria-label*="disconnect"]:hover {
              background: rgba(220, 38, 38, 0.95) !important;
              transform: translateY(-2px) scale(1.08) !important;
              box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4) !important;
            }
            
            .lk-disconnect-button svg {
              width: 26px !important;
              height: 26px !important;
            }
            
            /* Hide dropdown menus */
            .lk-button-group-menu,
            .lk-button[aria-haspopup="menu"],
            button[aria-label*="menu"],
            button[aria-label*="settings"] {
              display: none !important;
            }
          `}</style>
          <VideoGrid />
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-6 z-40 pointer-events-none">
          <div className="pointer-events-auto">
            <ControlBar 
              variation="minimal"
              controls={{
                microphone: true,
                camera: true,
                screenShare: true,
                leave: true,
                chat: false,
                settings: false,
              }}
            />
          </div>
        </div>
      </LiveKitRoom>
    </div>
  );
}
