const express = require('express');
const router = express.Router();
const { AccessToken } = require('livekit-server-sdk');
const { protect } = require('../middleware/auth');

// @route   POST /api/video-calls/token
// @desc    Generate LiveKit access token for video call
// @access  Private
router.post('/token', protect, async (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({
        success: false,
        message: 'Room name and participant name are required'
      });
    }

    // Check if LiveKit is configured
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'LiveKit is not configured. Please add LIVEKIT_API_KEY and LIVEKIT_API_SECRET to your .env file.'
      });
    }

    // Create access token
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: req.user._id.toString(),
        name: participantName,
        metadata: JSON.stringify({
          userId: req.user._id,
          email: req.user.email
        })
      }
    );

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const token = await at.toJwt();

    res.json({
      success: true,
      token,
      url: process.env.LIVEKIT_URL
    });
  } catch (error) {
    console.error('LiveKit token generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/video-calls/rooms
// @desc    Get list of active rooms (optional feature)
// @access  Private
router.get('/rooms', protect, async (req, res) => {
  try {
    // This is a placeholder - you can implement room listing if needed
    // For now, we'll just return an empty array
    res.json({
      success: true,
      rooms: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
