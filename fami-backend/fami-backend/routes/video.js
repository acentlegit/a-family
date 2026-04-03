/**
 * OpenAPI-compliant Video Service
 * POST /video/session - Create video session with domain, userId, sessionId
 */

const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const router = express.Router();

const apiKey = () => process.env.LIVEKIT_API_KEY || '';
const apiSecret = () => process.env.LIVEKIT_API_SECRET || '';
const livekitUrl = () => process.env.LIVEKIT_URL || '';

function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain is required');
  }
  if (domain.toLowerCase().trim() === 'personal') {
    return 'PERSONAL_USE';
  }
  return 'CUSTOM_DOMAIN';
}

/**
 * POST /video/session
 * Required: domain, userId, sessionId
 * Optional: metadata, participantName
 */
router.post('/session', async (req, res) => {
  try {
    if (!livekitUrl() || !apiKey() || !apiSecret()) {
      return res.status(503).json({ 
        success: false,
        error: 'LIVEKIT_NOT_CONFIGURED',
        message: 'LiveKit not configured.' 
      });
    }

    const { domain, userId, sessionId, metadata, participantName } = req.body;

    if (!domain) {
      return res.status(400).json({ 
        success: false,
        error: 'VALIDATION_ERROR', 
        message: 'domain is required',
        required: ['domain']
      });
    }
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'VALIDATION_ERROR', 
        message: 'userId is required',
        required: ['userId']
      });
    }
    if (!sessionId) {
      return res.status(400).json({ 
        success: false,
        error: 'VALIDATION_ERROR', 
        message: 'sessionId is required',
        required: ['sessionId']
      });
    }

    const domainType = validateDomain(String(domain).trim());
    // Default to "main" room if sessionId is "main" or empty
    const roomSuffix = sessionId === 'main' || !sessionId ? 'main' : sessionId;
    const roomName = `${domainType === 'PERSONAL_USE' ? 'personal' : String(domain).toLowerCase()}-${roomSuffix}`;
    const identity = `user-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const name = participantName || userId;

    const at = new AccessToken(apiKey(), apiSecret(), {
      identity,
      name: String(name),
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();

    return res.status(201).json({
      success: true,
      data: {
        token,
        url: livekitUrl(),
        roomName,
        sessionId: roomSuffix,
        domain,
        domainType,
        identity,
      }
    });
  } catch (err) {
    const msg = err.message;
    if (msg === 'Domain is required') {
      return res.status(400).json({ 
        success: false,
        error: 'VALIDATION_ERROR', 
        message: msg 
      });
    }
    return res.status(500).json({ 
      success: false,
      error: 'SESSION_ERROR', 
      message: msg 
    });
  }
});

module.exports = router;
