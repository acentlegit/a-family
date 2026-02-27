const express = require('express');
const router = express.Router();
const Memory = require('../models/Memory');
const Family = require('../models/Family');
const Member = require('../models/Member');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Configure multer for memory storage (we'll handle file storage ourselves)
const multer = require('multer');
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
  
  // Check if system S3 is configured (automatically enabled when credentials present)
  const hasSystemS3 = s3Storage.isSystemS3Configured();
  
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
          type: file.mimetype.startsWith('image') ? 'image' : 'video',
          url: result.url,
          thumbnail: result.thumbnailLink || result.url,
          googleDriveId: result.fileId,
          source: 'googleDrive'
        });
        
      } else if (storageMethod === 's3') {
        // Try to upload to S3, but fall back to local if it fails
        try {
          result = await s3Storage.uploadToS3(
            file.buffer,
            file.originalname,
            file.mimetype,
            user,
            familyName,
            eventName
          );
          
          mediaFiles.push({
            type: file.mimetype.startsWith('image') ? 'image' : 'video',
            url: result.url,
            thumbnail: result.url,
            s3Key: result.key,
            source: 's3'
          });
        } catch (s3Error) {
          console.warn(`⚠️ S3 upload failed for ${file.originalname}, falling back to local storage:`, s3Error.message);
          // Fall back to local storage
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
            type: file.mimetype.startsWith('image') ? 'image' : 'video',
            url: url,
            thumbnail: url,
            filename: filename,
            source: 'local'
          });
          console.log(`✅ Fallback: Saved ${file.originalname} to local storage as ${filename}`);
        }
        
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
}

// @route   GET /api/memories/:familyId
// @desc    Get all memories for a family
// @access  Private
router.get('/:familyId', protect, async (req, res) => {
  try {
    const memories = await Memory.find({ family: req.params.familyId })
      .populate('createdBy', 'firstName lastName avatar')
      .populate('comments.user', 'firstName lastName avatar')
      .populate('likes', 'firstName lastName avatar')
      .sort('-createdAt');

    res.json({ success: true, count: memories.length, data: memories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/memories/single/:id
// @desc    Get single memory
// @access  Private
router.get('/single/:id', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id)
      .populate('createdBy', 'firstName lastName avatar')
      .populate('comments.user', 'firstName lastName avatar')
      .populate('likes', 'firstName lastName avatar');

    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    res.json({ success: true, data: memory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/memories/:familyId
// @desc    Create new memory
// @access  Private
router.post('/:familyId', protect, upload.array('media', 10), async (req, res) => {
  try {
    const { title, description, date, location, tags } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }

    // Get user with Google Drive tokens and S3 config
    const userWithTokens = await User.findById(req.user._id).select('googleDriveTokens s3Config');
    
    // Get family name for folder structure
    const familyName = await Family.findById(req.params.familyId).select('name').then(f => f?.name);
    
    // Handle media uploads
    let mediaFiles = [];
    if (req.files && req.files.length > 0) {
      console.log(`📤 Uploading ${req.files.length} file(s) for memory: ${title}`);
      try {
        mediaFiles = await uploadToStorage(req.files, userWithTokens, familyName, title);
        console.log(`✅ Successfully uploaded ${mediaFiles.length} media file(s)`);
        if (mediaFiles.length > 0) {
          console.log('Media files:', JSON.stringify(mediaFiles.map(m => ({ url: m.url, filename: m.filename, source: m.source })), null, 2));
        } else {
          console.warn('⚠️ No media files were uploaded successfully');
        }
      } catch (uploadError) {
        console.error('❌ Error uploading media files:', uploadError);
        console.error('Upload error details:', {
          message: uploadError.message,
          stack: uploadError.stack,
          files: req.files.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype }))
        });
        // Continue without media if upload fails completely
        // Note: uploadToStorage now has fallback logic, so this should rarely happen
        mediaFiles = [];
        // Don't return error - allow memory to be created without media
        // User will see the memory but without images
        console.warn('⚠️ Continuing to create memory without media files');
      }
    } else {
      console.log('⚠️ No files provided in memory creation request');
    }

    console.log(`📝 Creating memory with ${mediaFiles.length} media file(s)`);
    
    const memory = await Memory.create({
      family: req.params.familyId,
      title: title.trim(),
      description: description || '',
      date: date || new Date(),
      location: location || '',
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      media: mediaFiles,
      createdBy: req.user._id
    });

    console.log(`✅ Memory created: ${memory._id} with ${memory.media.length} media items`);
    if (memory.media.length > 0) {
      console.log('Memory media URLs:', memory.media.map(m => ({ url: m.url, filename: m.filename, source: m.source })));
    }

    const populatedMemory = await Memory.findById(memory._id)
      .populate('createdBy', 'firstName lastName avatar');

    // Get family details for email notification
    const family = await Family.findById(req.params.familyId);
    
    // Get all family members' emails for notification
    const familyMembers = await Member.find({ family: req.params.familyId }).select('email firstName lastName');
    const familyUsers = await User.find({ _id: { $in: family.members.map(m => m.user) } }).select('email firstName lastName');
    
    // Collect all email addresses
    const notificationEmails = [];
    familyMembers.forEach(m => {
      if (m.email && m.email.includes('@')) {
        notificationEmails.push(m.email);
      }
    });
    familyUsers.forEach(u => {
      if (u.email && u.email.includes('@') && !notificationEmails.includes(u.email)) {
        notificationEmails.push(u.email);
      }
    });

    // Send email notification to family members
    if (notificationEmails.length > 0) {
      const { sendBulkEmail } = require('../utils/email');
      const createdByName = populatedMemory.createdBy ? `${populatedMemory.createdBy.firstName} ${populatedMemory.createdBy.lastName || ''}`.trim() : 'Someone';
      const memoryDate = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();
      
      const emailSubject = `New Family Memory: ${title}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">📸 New Family Memory Shared</h2>
          <p>Hello,</p>
          <p><strong>${createdByName}</strong> has shared a new memory with the <strong>${family.name}</strong> family:</p>
          <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Title:</strong> ${title}</p>
            ${description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${description}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Date:</strong> ${memoryDate}</p>
            ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ''}
            ${mediaFiles && mediaFiles.length > 0 ? `<p style="margin: 5px 0;"><strong>Media:</strong> ${mediaFiles.length} ${mediaFiles.length === 1 ? 'file' : 'files'} attached</p>` : ''}
          </div>
          <p style="color: #666; font-size: 14px;">You can view this memory in your Fami app.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated notification from Fami Family Management App.</p>
        </div>
      `;
      
      sendBulkEmail(notificationEmails, emailSubject, emailHtml).catch(err => {
        console.error('Error sending memory email:', err);
      });
    }

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.familyId).emit('new-memory', populatedMemory);
    }

    res.status(201).json({ success: true, data: populatedMemory });
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/memories/:id
// @desc    Update memory
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let memory = await Memory.findById(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    if (memory.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, description, date, location, tags } = req.body;

    memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { title, description, date, location, tags },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName avatar');

    res.json({ success: true, data: memory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/memories/:id
// @desc    Delete memory
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    if (memory.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete associated files if using local storage
    if (memory.media && memory.media.length > 0) {
      try {
        const localStorage = require('../utils/localStorage');
        memory.media.forEach(media => {
          if (media.filename) {
            localStorage.deleteFile(media.filename);
          }
        });
      } catch (err) {
        console.log('Could not delete files:', err.message);
      }
    }

    await memory.deleteOne();

    res.json({ success: true, message: 'Memory deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/memories/:id/like
// @desc    Like/Unlike memory
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    const likeIndex = memory.likes.indexOf(req.user._id);

    if (likeIndex > -1) {
      memory.likes.splice(likeIndex, 1);
    } else {
      memory.likes.push(req.user._id);
    }

    await memory.save();

    const populatedMemory = await Memory.findById(memory._id)
      .populate('likes', 'firstName lastName avatar');

    res.json({ success: true, data: populatedMemory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/memories/:id/comment
// @desc    Add comment to memory
// @access  Private
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;

    const memory = await Memory.findById(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    memory.comments.push({
      user: req.user._id,
      text
    });

    await memory.save();

    const populatedMemory = await Memory.findById(memory._id)
      .populate('comments.user', 'firstName lastName avatar');

    res.json({ success: true, data: populatedMemory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
