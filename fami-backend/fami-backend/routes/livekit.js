const express = require('express');
const {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  EncodedFileOutput,
  S3Upload,
  EncodingOptionsPreset,
} = require('livekit-server-sdk');
const { protect } = require('../middleware/auth');

const router = express.Router();

const apiKey = () => process.env.LIVEKIT_API_KEY || '';
const apiSecret = () => process.env.LIVEKIT_API_SECRET || '';
const livekitUrl = () => process.env.LIVEKIT_URL || '';

function livekitHost() {
  const url = livekitUrl();
  return url.replace(/^wss?:\/\//, 'https://').replace(/^https:\/\//, 'https://');
}

const breakoutRoomsMap = new Map();

// Get token for guest (no auth required for joining)
router.post('/token/guest', async (req, res) => {
  try {
    if (!livekitUrl() || !apiKey() || !apiSecret()) {
      return res.status(503).json({ error: 'LiveKit not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET in .env' });
    }
    const { roomName, participantName } = req.body;
    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'roomName and participantName required' });
    }
    const identity = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const at = new AccessToken(apiKey(), apiSecret(), {
      identity,
      name: participantName,
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    res.json({ token, url: livekitUrl(), roomName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create room - Only host can create (protected route)
router.post('/rooms', protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Room name required' });
    }
    const host = livekitHost();
    const svc = new RoomServiceClient(host, apiKey(), apiSecret());
    const room = await svc.createRoom({
      name: String(name).trim(),
      emptyTimeout: 10 * 60,
      maxParticipants: 50,
    });
    res.json({ room: { name: room.name, sid: room.sid } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List participants
router.get('/rooms/:roomName/participants', async (req, res) => {
  try {
    const { roomName } = req.params;
    const host = livekitHost();
    const svc = new RoomServiceClient(host, apiKey(), apiSecret());
    const participants = await svc.listParticipants(roomName);
    res.json({
      participants: participants.map((p) => ({
        identity: p.identity,
        name: p.name,
        sid: p.sid,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start recording
router.post('/rooms/:roomName/recording/start', async (req, res) => {
  try {
    const { roomName } = req.params;
    const { bucket: consumerBucket, domain, userId } = req.body || {};
    const defaultBucket = process.env.RECORDING_BUCKET || process.env.RECORDING_S3_BUCKET || process.env.S3_BUCKET;
    const region = process.env.S3_REGION || process.env.RECORDING_S3_REGION || 'us-east-1';
    const s3AccessKey = process.env.S3_ACCESS_KEY || process.env.RECORDING_S3_ACCESS_KEY;
    const s3Secret = process.env.S3_SECRET_KEY || process.env.RECORDING_S3_SECRET_KEY;

    const bucket = consumerBucket ? String(consumerBucket).trim() : defaultBucket;
    if (!bucket || !s3AccessKey || !s3Secret) {
      return res.status(503).json({
        error: consumerBucket
          ? 'S3 credentials required. Set S3_ACCESS_KEY, S3_SECRET_KEY.'
          : 'Recording not configured. Set RECORDING_BUCKET or S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY',
      });
    }

    const domainPart = (domain ? String(domain).trim() : null) || 'default';
    const userPart = (userId ? String(userId).trim() : null) || roomName;
    const prefix = process.env.RECORDING_PREFIX || 'Recordings';
    const filepath = consumerBucket
      ? `recordings/${roomName}/${Date.now()}.mp4`
      : `${prefix}/${domainPart}/${userPart}/${Date.now()}.mp4`;

    const host = livekitHost();
    const egressClient = new EgressClient(host, apiKey(), apiSecret());
    const fileOutput = new EncodedFileOutput({
      filepath,
      output: {
        case: 's3',
        value: new S3Upload({
          accessKey: s3AccessKey,
          secret: s3Secret,
          bucket,
          region,
        }),
      },
    });
    const info = await egressClient.startRoomCompositeEgress(roomName, fileOutput, {
      layout: 'grid',
      encodingOptions: EncodingOptionsPreset.H264_720P_30,
    });
    res.json({ egressId: info.egressId, status: info.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop recording
router.post('/recording/stop', async (req, res) => {
  try {
    const { egressId } = req.body;
    if (!egressId) return res.status(400).json({ error: 'egressId required' });
    const host = livekitHost();
    const egressClient = new EgressClient(host, apiKey(), apiSecret());
    const info = await egressClient.stopEgress(egressId);
    res.json({ egressId: info.egressId, status: info.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create breakout rooms
router.post('/rooms/:roomName/breakout', async (req, res) => {
  try {
    const { roomName } = req.params;
    const count = Math.min(Math.max(Number(req.body.count) || 2, 1), 20);
    const host = livekitHost();
    const svc = new RoomServiceClient(host, apiKey(), apiSecret());
    const names = [];
    for (let i = 1; i <= count; i++) {
      const name = `${roomName}-breakout-${i}`;
      await svc.createRoom({ name, emptyTimeout: 10 * 60, maxParticipants: 20 });
      names.push(name);
    }
    breakoutRoomsMap.set(roomName, [...(breakoutRoomsMap.get(roomName) || []), ...names]);
    const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || '';
    const rooms = names.map((name) => ({
      name,
      joinUrl: `${baseUrl}/video-calls?room=${encodeURIComponent(name)}`,
    }));
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List breakout rooms
router.get('/rooms/:roomName/breakout', async (req, res) => {
  const { roomName } = req.params;
  const names = breakoutRoomsMap.get(roomName) || [];
  const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || '';
  res.json({
    rooms: names.map((name) => ({
      name,
      joinUrl: `${baseUrl}/video-calls?room=${encodeURIComponent(name)}`,
    })),
  });
});

// Move participant to breakout room
router.post('/rooms/:roomName/breakout/move', async (req, res) => {
  try {
    const { roomName } = req.params;
    const { participantIdentity, destinationRoomName } = req.body;
    if (!participantIdentity || !destinationRoomName) {
      return res.status(400).json({ error: 'participantIdentity and destinationRoomName required' });
    }
    const host = livekitHost();
    const svc = new RoomServiceClient(host, apiKey(), apiSecret());
    // Note: LiveKit doesn't have a direct move API, so we'd need to implement this differently
    // For now, return success (this would require additional implementation)
    res.json({ success: true, message: 'Move functionality requires additional implementation' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
