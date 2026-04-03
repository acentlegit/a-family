const express = require('express');
const router = express.Router();
const Memory = require('../models/Memory');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');
const multer = require('multer');

// Configure multer for memory storage (we'll handle file storage ourselves)
const upload = multer({ storage: multer.memoryStorage() });

// Import storage utilities
const s3Storage = require('../utils/s3Storage');
const localStorage = require('../utils/localStorage');
const getBaseUrl = require('../utils/getBaseUrl');

/**
 * Smart storage handler - automatically detects environment
 * Priority: Google Drive (if connected) > S3 (if configured) > Local (fallback)
 * Note: S3 is used automatically when AWS credentials are present, no NODE_ENV check needed
 */
const uploadToStorage = async (files, user, familyName = null, eventName = null) => {
  const mediaFiles = [];
  
  // Check if user has Google Drive connected
  const hasGoogleDrive = user && user.googleDriveTokens && user.googleDriveTokens.access_token;
  
  // Check if user has their own S3 configured
  const hasUserS3 = s3Storage.isUserS3Configured(user);
  
  // Check if system S3 is configured (production environment)
  const hasSystemS3 = s3Storage.isSystemS3Configured();
  
  // Check if running in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('📊 Storage Detection:');
  console.log('  Google Drive:', hasGoogleDrive ? '✅ Connected' : '❌ Not connected');
  console.log('  User S3:', hasUserS3 ? '✅ Configured' : '❌ Not configured');
  console.log('  System S3:', hasSystemS3 ? '✅ Configured' : '❌ Not configured');
  console.log('  Family Name:', familyName || 'Not provided');
  console.log('  Event Name:', eventName || 'Not provided');
  
  // Determine storage method - S3 is used automatically when configured
  let storageMethod = 'local';
  if (hasGoogleDrive) {
    storageMethod = 'googleDrive';
  } else if (hasUserS3) {
    storageMethod = 's3';
  } else if (hasSystemS3) {
    storageMethod = 's3'; // Use S3 automatically when credentials are present
  }
  
  console.log('  Selected Storage:', storageMethod);
  
  // Upload based on selected method
  for (const file of files) {
    try {
      let result;
      
      if (storageMethod === 'googleDrive') {
        // Upload to Google Drive
        const googleDrive = require('../utils/googleDrive');
        await googleDrive.setCredentials(user.googleDriveTokens);
        result = await googleDrive.uploadToDrive(
          file.buffer,
          file.originalname,
          file.mimetype,
          null,
          eventName
        );
        
        mediaFiles.push({
          _id: new mongoose.Types.ObjectId(),
          type: file.mimetype.startsWith('image') ? 'image' : 'video',
          url: result.url,
          thumbnail: result.thumbnailLink || result.url,
          googleDriveId: result.fileId,
          source: 'googleDrive'
        });
        
      } else if (storageMethod === 's3') {
        // Upload to S3 with folder structure
        result = await s3Storage.uploadToS3(
          file.buffer,
          file.originalname,
          file.mimetype,
          user,
          familyName,
          eventName
        );
        
        mediaFiles.push({
          _id: new mongoose.Types.ObjectId(),
          type: file.mimetype.startsWith('image') ? 'image' : 'video',
          url: result.url,
          thumbnail: result.url,
          s3Key: result.key,
          source: 's3'
        });
        
      } else {
        // Upload to local storage
        // Save file locally first
        const fs = require('fs');
        const path = require('path');
        const crypto = require('crypto');
        
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const extension = file.originalname.split('.').pop();
        const filename = `${timestamp}-${randomString}.${extension}`;
        
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, file.buffer);
        
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/uploads/${filename}`;
        
        mediaFiles.push({
          _id: new mongoose.Types.ObjectId(),
          type: file.mimetype.startsWith('image') ? 'image' : 'video',
          url: url,
          thumbnail: url,
          filename: filename,
          source: 'local'
        });
      }
      
      console.log(`✅ Uploaded to ${storageMethod}:`, file.originalname);
      
    } catch (error) {
      console.error(`❌ Error uploading ${file.originalname}:`, error.message);
      throw error;
    }
  }
  
  return mediaFiles;
};

// @route   GET /api/media/:familyId
// @desc    Get all media for a family
// @access  Private
router.get('/:familyId', protect, async (req, res) => {
  try {
    const { type } = req.query;

    const query = { family: req.params.familyId };

    const memories = await Memory.find(query)
      .populate('createdBy', 'firstName lastName avatar')
      .sort('-createdAt');

    // Get user for S3 configuration
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('s3Config');
    
    // Import presigned URL utility and S3 storage
    const { getSignedUrlForObject, isPrivateBucket } = require('../utils/s3SignedUrls');
    const s3Storage = require('../utils/s3Storage');
    const isS3Configured = s3Storage.isSystemS3Configured() || s3Storage.isUserS3Configured(user);

    let allMedia = [];
    for (const memory of memories) {
      if (memory.media && memory.media.length > 0) {
        for (const media of memory.media) {
          if (!type || media.type === type) {
            let mediaUrl = media.url;
            let thumbnailUrl = media.thumbnail || media.url;
            
            // If media is stored in S3 (detected by source or URL), generate presigned URL
            const isS3Url = mediaUrl && mediaUrl.includes('amazonaws.com');
            
            if (isS3Configured && (media.source === 's3' || isS3Url)) {
              let s3Key = media.s3Key;
              
              // If s3Key is not stored, extract it from the URL (even if presigned)
              if (!s3Key && mediaUrl) {
                // Extract key from S3 URL patterns:
                // https://bucket.s3.region.amazonaws.com/key?params
                // https://s3.region.amazonaws.com/bucket/key?params
                // Remove query parameters to get the base URL
                const urlWithoutQuery = mediaUrl.split('?')[0];
                const urlMatch = urlWithoutQuery.match(/amazonaws\.com\/(.+)$/);
                if (urlMatch) {
                  const path = urlMatch[1];
                  const bucket = s3Storage.getS3Bucket(user);
                  
                  console.log(`🔍 Extracting S3 key from URL: ${urlWithoutQuery}`);
                  console.log(`   Path after amazonaws.com: ${path}`);
                  console.log(`   Bucket: ${bucket}`);
                  
                  // Check if it's path-style (s3.region.amazonaws.com/bucket/key)
                  if (bucket && path.startsWith(bucket + '/')) {
                    s3Key = path.substring(bucket.length + 1);
                    console.log(`   Extracted S3 key (path-style): ${s3Key}`);
                  } else {
                    // Virtual-hosted style or just the key
                    s3Key = path;
                    console.log(`   Extracted S3 key (virtual-hosted): ${s3Key}`);
                  }
                } else {
                  console.warn(`⚠️  Could not match S3 URL pattern: ${urlWithoutQuery}`);
                }
              }
              
              if (s3Key) {
                try {
                  // Generate presigned URL for S3 objects (works for both public and private buckets)
                  const signedUrl = await getSignedUrlForObject(s3Key, 3600, user);
                  mediaUrl = signedUrl;
                  thumbnailUrl = signedUrl;
                  console.log(`✅ Generated presigned URL for S3 object: ${s3Key}`);
                  console.log(`   Presigned URL: ${signedUrl.substring(0, 100)}...`);
                } catch (s3Error) {
                  console.error(`❌ Error generating presigned URL for ${s3Key}:`, s3Error.message);
                  console.error(`   Original URL: ${mediaUrl}`);
                  console.error(`   Will use original URL as fallback`);
                  // Keep the original URL - don't overwrite it with undefined
                  // The original URL might work if the bucket is public
                }
              } else {
                console.warn(`⚠️  Could not extract S3 key from URL: ${mediaUrl}`);
                console.warn(`   Will use original URL: ${mediaUrl}`);
              }
            }
            
            allMedia.push({
              _id: media._id || `${memory._id}-${Date.now()}`,
              type: media.type,
              url: mediaUrl,
              thumbnail: thumbnailUrl,
              filename: media.filename,
              s3Key: media.s3Key,
              source: media.source,
              memoryId: memory._id,
              memoryTitle: memory.title,
              createdBy: memory.createdBy,
              createdAt: memory.createdAt
            });
          }
        }
      }
    }

    res.json({ success: true, count: allMedia.length, data: allMedia });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/media/:familyId
// @desc    Upload media to family (creates a memory) - Smart Storage (S3/Google Drive/Local)
// @access  Private
router.post('/:familyId', protect, upload.array('media', 10), async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('  Files:', req.files?.length || 0);
    console.log('  Family ID:', req.params.familyId);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Validate file sizes
    const { validateFiles } = require('../utils/fileSizeValidator');
    const validation = validateFiles(req.files);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: 'File size validation failed',
        errors: validation.errors 
      });
    }

    // Get user with Google Drive tokens and S3 config
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('googleDriveTokens s3Config');
    
    // Get family name for folder structure
    const Family = require('../models/Family');
    const family = await Family.findById(req.params.familyId).select('name');
    const familyName = family ? family.name : null;
    
    // Get event name if provided
    const eventName = req.body.eventName || null;
    
    // Upload using smart storage handler
    const mediaFiles = await uploadToStorage(req.files, user, familyName, eventName);
    
    console.log('✅ Media files processed:', mediaFiles.length, 'files');

    // Create a memory for the uploaded media
    const memory = await Memory.create({
      family: req.params.familyId,
      title: `Media Upload - ${new Date().toLocaleDateString()}`,
      description: 'Uploaded from Media Gallery',
      media: mediaFiles,
      createdBy: req.user._id
    });

    const populatedMemory = await Memory.findById(memory._id)
      .populate('createdBy', 'firstName lastName avatar');

    console.log('✅ Memory created successfully:', populatedMemory._id);
    res.status(201).json({ success: true, data: populatedMemory });
  } catch (error) {
    console.error('❌ Error uploading media:', error);
    res.status(500).json({ success: false, message: error.message, error: error.toString() });
  }
});

// @route   DELETE /api/media/:id
// @desc    Delete media item
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Find the memory containing this media
    const memory = await Memory.findOne({ 'media._id': req.params.id });

    if (!memory) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    // Check authorization
    if (memory.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Find and remove the media item
    const mediaItem = memory.media.find(m => m._id.toString() === req.params.id);
    
    if (mediaItem) {
      // Delete file if using local storage
      if (mediaItem.filename) {
        try {
          const localStorage = require('../utils/localStorage');
          localStorage.deleteFile(mediaItem.filename);
        } catch (err) {
          console.log('Could not delete file:', err.message);
        }
      }

      // Remove from array
      memory.media = memory.media.filter(m => m._id.toString() !== req.params.id);
      
      // If no media left, delete the memory
      if (memory.media.length === 0) {
        await memory.deleteOne();
      } else {
        await memory.save();
      }
    }

    res.json({ success: true, message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
