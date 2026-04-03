const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const Family = require('../models/Family');
const { protect } = require('../middleware/auth');

// Configure multer for memory storage (we'll handle file storage ourselves)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Import storage utilities
const s3Storage = require('../utils/s3Storage');
const getBaseUrl = require('../utils/getBaseUrl');

/**
 * Smart storage handler for albums
 * Uses S3 automatically when credentials are present
 */
const uploadHandler = async (files, user, familyName = null, albumName = null) => {
  const mediaFiles = [];
  
  // Check if user has their own S3 configured
  const hasUserS3 = s3Storage.isUserS3Configured(user);
  
  // Check if system S3 is configured (automatically enabled when credentials present)
  const hasSystemS3 = s3Storage.isSystemS3Configured();
  
  // Determine storage method - S3 is used automatically when configured
  let storageMethod = 'local';
  if (hasUserS3) {
    storageMethod = 's3';
  } else if (hasSystemS3) {
    storageMethod = 's3'; // Use S3 automatically when credentials are present
  }
  
  console.log('📊 Album Storage:', storageMethod);
  
  // Upload based on selected method
  for (const file of files) {
    try {
      if (storageMethod === 's3') {
        // Upload to S3 with folder structure
        const result = await s3Storage.uploadToS3(
          file.buffer,
          file.originalname,
          file.mimetype,
          user,
          familyName,
          albumName
        );
        
        mediaFiles.push({
          filename: result.filename,
          url: result.url,
          description: '',
          s3Key: result.key,
          source: 's3'
        });
        
      } else {
        // Upload to local storage
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
          filename: filename,
          url: url,
          description: '',
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

// @route   GET /api/albums/family/:familyId
// @desc    Get all albums for a family
// @access  Private
router.get('/family/:familyId', protect, async (req, res) => {
  try {
    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is a member
    const isMember = family.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const albums = await Album.find({ family: req.params.familyId })
      .populate('createdBy', 'firstName lastName avatar')
      .populate('photos.uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, albums });
  } catch (error) {
    console.error('Get albums error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/albums/:albumId
// @desc    Get album by ID with all photos
// @access  Private
router.get('/:albumId', protect, async (req, res) => {
  try {
    const album = await Album.findById(req.params.albumId)
      .populate('family', 'name')
      .populate('createdBy', 'firstName lastName avatar')
      .populate('photos.uploadedBy', 'firstName lastName avatar')
      .populate('photos.tags', 'firstName lastName')
      .populate('photos.comments.user', 'firstName lastName avatar');

    if (!album) {
      return res.status(404).json({ success: false, message: 'Album not found' });
    }

    // Check if user is a member of the family
    const family = await Family.findById(album.family);
    const isMember = family.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, album });
  } catch (error) {
    console.error('Get album error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/albums
// @desc    Create a new album
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, familyId } = req.body;

    if (!name || !familyId) {
      return res.status(400).json({ success: false, message: 'Name and familyId are required' });
    }

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is a member
    const isMember = family.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const album = await Album.create({
      family: familyId,
      name,
      description,
      createdBy: req.user._id
    });

    const populatedAlbum = await Album.findById(album._id)
      .populate('createdBy', 'firstName lastName avatar');

    res.status(201).json({ success: true, album: populatedAlbum });
  } catch (error) {
    console.error('Create album error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/albums/:albumId
// @desc    Update album
// @access  Private
router.put('/:albumId', protect, async (req, res) => {
  try {
    const { name, description, coverPhoto } = req.body;
    const album = await Album.findById(req.params.albumId);

    if (!album) {
      return res.status(404).json({ success: false, message: 'Album not found' });
    }

    // Check if user is a member
    const family = await Family.findById(album.family);
    const isMember = family.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (name) album.name = name;
    if (description !== undefined) album.description = description;
    if (coverPhoto) album.coverPhoto = coverPhoto;
    album.updatedAt = new Date();

    await album.save();

    const populatedAlbum = await Album.findById(album._id)
      .populate('createdBy', 'firstName lastName avatar');

    res.json({ success: true, album: populatedAlbum });
  } catch (error) {
    console.error('Update album error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/albums/:albumId/photos
// @desc    Upload photos to album
// @access  Private
router.post('/:albumId/photos', protect, upload.array('photos', 20), async (req, res) => {
  try {
    const album = await Album.findById(req.params.albumId);
    if (!album) {
      return res.status(404).json({ success: false, message: 'Album not found' });
    }

    // Check if user is a member
    const family = await Family.findById(album.family);
    const isMember = family.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Get user with S3 config
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('s3Config');
    
    const photos = await uploadHandler(req.files, user, family.name, album.name);
    const photosWithUser = photos.map(photo => ({
      ...photo,
      uploadedBy: req.user._id
    }));

    album.photos.push(...photosWithUser);
    album.updatedAt = new Date();
    await album.save();

    const populatedAlbum = await Album.findById(album._id)
      .populate('photos.uploadedBy', 'firstName lastName avatar');

    res.status(201).json({ success: true, album: populatedAlbum });
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/albums/:albumId
// @desc    Delete album (Admin only)
// @access  Private
router.delete('/:albumId', protect, async (req, res) => {
  try {
    const album = await Album.findById(req.params.albumId);
    if (!album) {
      return res.status(404).json({ success: false, message: 'Album not found' });
    }

    // Check if user is admin
    const family = await Family.findById(album.family);
    const member = family.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    await Album.findByIdAndDelete(req.params.albumId);
    res.json({ success: true, message: 'Album deleted' });
  } catch (error) {
    console.error('Delete album error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
