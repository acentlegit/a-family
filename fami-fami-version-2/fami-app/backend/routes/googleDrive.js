const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const googleDrive = require('../utils/googleDrive');
const User = require('../models/User');

const upload = multer({ storage: multer.memoryStorage() });

// @route   GET /api/google-drive/auth-url
// @desc    Get Google Drive authorization URL
// @access  Private
router.get('/auth-url', protect, async (req, res) => {
  try {
    if (!googleDrive.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env'
      });
    }

    const authUrl = googleDrive.getAuthUrl();
    
    // Log the redirect URI being used for debugging
    const getClientUrl = require('../utils/getClientUrl');
    const clientUrl = getClientUrl();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${clientUrl}/auth/google/callback`;
    console.log('🔍 Google Drive OAuth - Redirect URI being used:', redirectUri);
    console.log('🔍 Google Drive OAuth - CLIENT_URL:', clientUrl);
    
    res.json({ 
      success: true, 
      authUrl,
      redirectUri: redirectUri // Include in response for debugging
    });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/google-drive/callback
// @desc    Handle Google OAuth callback (redirects to frontend)
// @access  Public
router.get('/callback', async (req, res) => {
  try {
    const getClientUrl = require('../utils/getClientUrl');
    const clientUrl = getClientUrl();
    
    const { code, error: oauthError } = req.query;
    
    // Handle OAuth errors from Google
    if (oauthError) {
      console.error('Google OAuth error:', oauthError);
      return res.redirect(`${clientUrl}/media?googleDriveError=true&message=${encodeURIComponent(oauthError)}`);
    }
    
    if (!code) {
      return res.redirect(`${clientUrl}/media?googleDriveError=true&message=no_code`);
    }
    
    // Just redirect to frontend callback page with code
    // Frontend will exchange code for tokens via /authorize endpoint
    // This avoids double token exchange
    console.log('✅ Redirecting to frontend callback with code');
    res.redirect(`${clientUrl}/auth/google/callback?code=${code}`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const getClientUrl = require('../utils/getClientUrl');
    const clientUrl = getClientUrl();
    res.redirect(`${clientUrl}/media?googleDriveError=true&message=${encodeURIComponent(error.message)}`);
  }
});

// @route   GET /api/google-drive/redirect-uri
// @desc    Get the current redirect URI (for debugging)
// @access  Private
router.get('/redirect-uri', protect, async (req, res) => {
  try {
    const getClientUrl = require('../utils/getClientUrl');
    const clientUrl = getClientUrl();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${clientUrl}/auth/google/callback`;
    
    res.json({
      success: true,
      redirectUri,
      clientUrl,
      message: `Add this EXACT URI to Google Cloud Console: ${redirectUri}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/google-drive/authorize
// @desc    Exchange authorization code for tokens (automatic, no passcode required)
// @access  Private
router.post('/authorize', protect, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    console.log('🔐 Exchanging authorization code for tokens...');
    const tokens = await googleDrive.getTokensFromCode(code);
    console.log('✅ Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });
    
    // Save tokens to user
    await User.findByIdAndUpdate(req.user._id, {
      googleDriveTokens: tokens
    });
    console.log('✅ Tokens saved to database for user:', req.user._id);

    res.json({
      success: true,
      message: 'Google Drive connected successfully'
    });
  } catch (error) {
    console.error('❌ Error authorizing Google Drive:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to authorize Google Drive'
    });
  }
});

// @route   POST /api/google-drive/upload
// @desc    Upload file to Google Drive
// @access  Private
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('googleDriveTokens googleDriveRootFolderId');
    const { eventName } = req.body; // Get eventName from request body

    // Check if user has valid tokens
    if (!user || !user.googleDriveTokens || !user.googleDriveTokens.access_token) {
      console.error('❌ Google Drive not connected - no valid tokens');
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected. Please click "Connect Drive" button first.',
        needsConnection: true
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      // Update tokens in database if refreshed
      console.log('🔐 Setting Google Drive credentials...');
      const updatedTokens = await googleDrive.setCredentials(user.googleDriveTokens);
      if (updatedTokens && JSON.stringify(updatedTokens) !== JSON.stringify(user.googleDriveTokens)) {
        console.log('🔄 Tokens refreshed, updating database...');
        await User.findByIdAndUpdate(req.user._id, { googleDriveTokens: updatedTokens });
      }
      console.log('✅ Credentials set successfully');
    } catch (tokenError) {
      console.error('❌ Error setting credentials:', tokenError);
      console.error('Token error details:', tokenError.message);
      return res.status(401).json({
        success: false,
        message: 'Google Drive authentication failed. Please reconnect your account by clicking "Connect Drive" button.',
        needsConnection: true
      });
    }

    let parentFolderId = user.googleDriveRootFolderId;

    // 1. Ensure 'fami' root folder exists for the user
    if (!parentFolderId) {
      parentFolderId = await googleDrive.createOrGetFolder('fami');
      await User.findByIdAndUpdate(req.user._id, { googleDriveRootFolderId: parentFolderId });
    }

    // 2. If eventName is provided, create a subfolder for the event
    let targetFolderId = parentFolderId;
    if (eventName) {
      targetFolderId = await googleDrive.createOrGetFolder(eventName, parentFolderId);
    }

    const result = await googleDrive.uploadToDrive(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      targetFolderId // Use the event folder ID or the 'fami' root folder ID
    );

    res.json({
      success: true,
      message: 'File uploaded to Google Drive successfully',
      data: {
        fileId: result.id,
        webViewLink: result.webViewLink,
        webContentLink: result.webContentLink,
        name: result.name
      }
    });
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file to Google Drive'
    });
  }
});

// @route   GET /api/google-drive/status
// @desc    Check Google Drive connection status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('googleDriveTokens googleDriveRootFolderId');
    
    // Check if tokens exist AND are valid (have access_token)
    const hasValidTokens = !!(user && user.googleDriveTokens && user.googleDriveTokens.access_token);
    const isConfigured = googleDrive.isConfigured();

    res.json({
      success: true,
      isConnected: hasValidTokens,
      isConfigured: isConfigured,
      hasRootFolder: !!user?.googleDriveRootFolderId
    });
  } catch (error) {
    console.error('Error checking Google Drive status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/google-drive/disconnect
// @desc    Disconnect Google Drive
// @access  Private
router.post('/disconnect', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { googleDriveTokens: '', googleDriveRootFolderId: '' }
    });

    res.json({
      success: true,
      message: 'Google Drive disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Google Drive:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
