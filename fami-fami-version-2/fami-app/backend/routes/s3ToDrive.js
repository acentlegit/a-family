const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const googleDrive = require('../utils/googleDrive');
const User = require('../models/User');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

// Helper: Convert stream to buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// @route   POST /api/s3-to-drive/upload
// @desc    Upload file from S3 to Google Drive
// @access  Private
router.post('/upload', protect, async (req, res) => {
  try {
    const { bucket, key, eventName } = req.body;

    if (!bucket || !key) {
      return res.status(400).json({
        success: false,
        message: 'Bucket and key are required'
      });
    }

    // Get user's Google Drive tokens
    const user = await User.findById(req.user._id).select('googleDriveTokens googleDriveRootFolderId');
    
    if (!user || !user.googleDriveTokens) {
      return res.status(401).json({
        success: false,
        message: 'Google Drive not connected. Please connect your Google Drive first.'
      });
    }

    // Set Google Drive credentials
    googleDrive.setCredentials(user.googleDriveTokens);

    // 1. Download file from S3
    let fileBuffer;
    try {
      const s3Response = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      
      // Convert stream to buffer
      fileBuffer = await streamToBuffer(s3Response.Body);
      
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('Empty file downloaded from S3');
      }
    } catch (s3Error) {
      console.error('S3 download error:', s3Error);
      return res.status(500).json({
        success: false,
        message: `Failed to download file from S3: ${s3Error.message}`
      });
    }

    // 2. Determine folder structure
    let parentFolderId = user.googleDriveRootFolderId;

    // Ensure 'fami' root folder exists
    if (!parentFolderId) {
      parentFolderId = await googleDrive.createFolder('fami');
      await User.findByIdAndUpdate(req.user._id, { googleDriveRootFolderId: parentFolderId });
    }

    // If eventName is provided, create/use event folder
    let targetFolderId = parentFolderId;
    if (eventName) {
      targetFolderId = await googleDrive.createFolder(eventName, parentFolderId);
    }

    // 3. Get file name and mime type
    const fileName = key.split('/').pop() || 'uploaded-file';
    const mimeType = req.body.mimeType || 'application/octet-stream';

    // 4. Upload to Google Drive
    const driveResult = await googleDrive.uploadToDrive(
      fileBuffer,
      fileName,
      mimeType,
      targetFolderId
    );

    res.json({
      success: true,
      message: 'File uploaded to Google Drive successfully',
      data: {
        fileId: driveResult.id,
        webViewLink: driveResult.webViewLink,
        webContentLink: driveResult.webContentLink,
        name: driveResult.name
      }
    });
  } catch (error) {
    console.error('S3 to Drive upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file from S3 to Google Drive'
    });
  }
});

// @route   GET /api/s3-to-drive/check
// @desc    Check if S3 and Google Drive are configured
// @access  Private
router.get('/check', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('googleDriveTokens');
    
    const s3Configured = !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION
    );

    const googleDriveConnected = !!(user && user.googleDriveTokens);

    res.json({
      success: true,
      data: {
        s3Configured,
        googleDriveConnected,
        ready: s3Configured && googleDriveConnected
      }
    });
  } catch (error) {
    console.error('Check configuration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
