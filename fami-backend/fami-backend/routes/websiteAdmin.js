const express = require('express');
const router = express.Router();
const WebsiteConfig = require('../models/WebsiteConfig');
const WebsitePage = require('../models/WebsitePage');
const { buildStaticSite } = require('../services/websiteGenerator');
const { publishToS3 } = require('../services/s3Publisher');
const { protect } = require('../middleware/auth');
const { hasPermission } = require('../middleware/rbac');
const { generateWebsiteStructure, checkOllamaStatus } = require('../services/ollamaService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'website-logos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadLogo = multer({ 
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Configure multer for sample image uploads
const sampleImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'sample-images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'sample-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadSampleImage = multer({ 
  storage: sampleImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Test route to verify registration
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Website admin route is working!' });
});

// Test route for generate-with-ai (without auth for debugging)
router.get('/test-generate-route', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Generate route path is accessible',
    expectedPath: '/api/website-admin/generate-with-ai/:familyId',
    method: 'POST'
  });
});

/**
 * GET /api/website-admin/config/:familyId
 * Get website configuration for a family
 */
router.get('/config/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    
    // Validate familyId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid family ID format' 
      });
    }
    
    const config = await WebsiteConfig.findOne({ familyId: new mongoose.Types.ObjectId(familyId) });
    
    if (!config) {
      return res.json({ success: true, config: null });
    }
    
    // Convert MongoDB document to plain object with snake_case for compatibility
    const configObj = config.toObject();
    const formattedConfig = {
      id: configObj._id.toString(),
      family_id: configObj.familyId.toString(),
      site_title: configObj.siteTitle,
      header_text: configObj.headerText,
      footer_text: configObj.footerText,
      theme: configObj.theme,
      layout: configObj.layout,
      logo_url: configObj.logoUrl,
      sample_image_url: configObj.sampleImageUrl,
      domain: configObj.domain,
      description: configObj.description,
      custom_pages: configObj.customPages,
      s3_bucket_name: configObj.s3BucketName,
      cloudfront_distribution_id: configObj.cloudfrontDistributionId,
      cloudfront_url: configObj.cloudfrontUrl,
      created_at: configObj.createdAt,
      updated_at: configObj.updatedAt
    };
    
    res.json({ success: true, config: formattedConfig });
  } catch (error) {
    console.error('Error fetching website config:', error);
    // Ensure error message doesn't reference PostgreSQL (this app uses MongoDB only)
    const errorMessage = error.message || 'Internal server error';
    const cleanErrorMessage = errorMessage.includes('PostgreSQL') || errorMessage.includes('PG_') 
      ? 'Database connection error. Please check MongoDB connection.' 
      : errorMessage;
    res.status(500).json({ success: false, error: cleanErrorMessage });
  }
});

/**
 * POST /api/website-admin/config/:familyId
 * Create or update website configuration
 */
router.post('/config/:familyId', protect, async (req, res) => {
  try {
    console.log('📝 POST /api/website-admin/config/:familyId - Request received');
    console.log('  Full URL:', req.originalUrl);
    console.log('  Family ID:', req.params.familyId);
    console.log('  Body:', req.body);
    console.log('  User:', req.user?.email || req.user?._id);
    
    const { familyId } = req.params;
    const { siteTitle, headerText, footerText, theme, layout, logoUrl, sampleImageUrl, domain, description, customPages } = req.body;
    
    // Validate familyId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid family ID format' 
      });
    }
    
    // Create or update website config using findOneAndUpdate with upsert
    const config = await WebsiteConfig.findOneAndUpdate(
      { familyId: new mongoose.Types.ObjectId(familyId) },
      {
        siteTitle: siteTitle || '',
        headerText: headerText || '',
        footerText: footerText || '',
        theme: theme || 'light',
        layout: layout || 'sidebar',
        logoUrl: logoUrl || '',
        sampleImageUrl: sampleImageUrl || '',
        domain: domain || '',
        description: description || '',
        customPages: customPages || '',
        updatedAt: Date.now()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    // Convert to format expected by frontend (snake_case)
    const configObj = config.toObject();
    const formattedConfig = {
      id: configObj._id.toString(),
      family_id: configObj.familyId.toString(),
      site_title: configObj.siteTitle,
      header_text: configObj.headerText,
      footer_text: configObj.footerText,
      theme: configObj.theme,
      layout: configObj.layout,
      logo_url: configObj.logoUrl,
      sample_image_url: configObj.sampleImageUrl,
      domain: configObj.domain,
      description: configObj.description,
      custom_pages: configObj.customPages,
      s3_bucket_name: configObj.s3BucketName,
      cloudfront_distribution_id: configObj.cloudfrontDistributionId,
      cloudfront_url: configObj.cloudfrontUrl,
      created_at: configObj.createdAt,
      updated_at: configObj.updatedAt
    };
    
    res.json({ success: true, config: formattedConfig });
  } catch (error) {
    console.error('❌ Error saving website config:', error);
    console.error('  Error code:', error.code);
    console.error('  Error message:', error.message);
    console.error('  Error stack:', error.stack);
    
    // Ensure error message doesn't reference PostgreSQL (this app uses MongoDB only)
    const errorMessage = error.message || 'Internal server error';
    const cleanErrorMessage = errorMessage.includes('PostgreSQL') || errorMessage.includes('PG_') 
      ? 'Database connection error. Please check MongoDB connection.' 
      : errorMessage;
    
    res.status(500).json({ 
      success: false, 
      error: cleanErrorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/website-admin/upload-logo/:familyId
 * Upload logo for website
 */
router.post('/upload-logo/:familyId', protect, uploadLogo.single('logo'), async (req, res) => {
  try {
    const { familyId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No logo file uploaded' });
    }

    // Validate familyId
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid family ID format' 
      });
    }

    const logoUrl = `/uploads/website-logos/${req.file.filename}`;
    const getBaseUrl = require('../utils/getBaseUrl');
    const baseUrl = getBaseUrl();
    const fullLogoUrl = `${baseUrl}${logoUrl}`;

    // Update or create website config with logo URL
    await WebsiteConfig.findOneAndUpdate(
      { familyId: new mongoose.Types.ObjectId(familyId) },
      { 
        logoUrl: fullLogoUrl,
        updatedAt: Date.now()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({ success: true, message: 'Logo uploaded and saved successfully', logoUrl: fullLogoUrl });
  } catch (error) {
    console.error('Error uploading logo:', error);
    console.error('Error details:', { code: error.code, message: error.message, stack: error.stack });
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload logo',
      error: error.code || 'UNKNOWN_ERROR'
    });
  }
});

/**
 * POST /api/website-admin/upload-sample-image/:familyId
 * Upload sample image for website
 */
router.post('/upload-sample-image/:familyId', protect, uploadSampleImage.single('sampleImage'), async (req, res) => {
  try {
    const { familyId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No sample image file uploaded' });
    }

    // Validate familyId
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid family ID format' 
      });
    }

    const imageUrl = `/uploads/sample-images/${req.file.filename}`;
    const getBaseUrl = require('../utils/getBaseUrl');
    const baseUrl = getBaseUrl();
    const fullImageUrl = `${baseUrl}${imageUrl}`;

    // Update or create website config with sample image URL
    await WebsiteConfig.findOneAndUpdate(
      { familyId: new mongoose.Types.ObjectId(familyId) },
      { 
        sampleImageUrl: fullImageUrl,
        updatedAt: Date.now()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({ success: true, message: 'Sample image uploaded and saved successfully', imageUrl: fullImageUrl });
  } catch (error) {
    console.error('Error uploading sample image:', error);
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload sample image'
    });
  }
});

/**
 * GET /api/website-admin/pages/:familyId
 * Get all pages for a family
 */
router.get('/pages/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    
    // Validate familyId
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid family ID format',
        pages: []
      });
    }
    
    const pages = await WebsitePage.find({ 
      familyId: new mongoose.Types.ObjectId(familyId) 
    }).sort({ createdAt: 1 });
    
    // Convert to format expected by frontend
    const formattedPages = pages.map(page => {
      const pageObj = page.toObject();
      return {
        id: pageObj._id.toString(),
        family_id: pageObj.familyId.toString(),
        page_type: pageObj.pageType,
        page_title: pageObj.pageTitle,
        page_slug: pageObj.pageSlug,
        route_path: pageObj.routePath,
        is_published: pageObj.isPublished,
        published_at: pageObj.publishedAt,
        s3_key: pageObj.s3Key,
        s3_url: pageObj.s3Url,
        content_blocks: pageObj.contentBlocks || [],
        created_at: pageObj.createdAt,
        updated_at: pageObj.updatedAt
      };
    });
    
    res.json({ success: true, pages: formattedPages });
  } catch (error) {
    console.error('Error fetching pages:', error);
    // Ensure error message doesn't reference PostgreSQL (this app uses MongoDB only)
    const errorMessage = error.message || 'Internal server error';
    const cleanErrorMessage = errorMessage.includes('PostgreSQL') || errorMessage.includes('PG_') 
      ? 'Database connection error. Please check MongoDB connection.' 
      : errorMessage;
    res.status(500).json({ success: false, error: cleanErrorMessage, pages: [] });
  }
});

/**
 * POST /api/website-admin/pages/:familyId
 * Create a new page
 */
router.post('/pages/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { pageType, pageTitle, pageSlug, routePath, contentBlocks } = req.body;
    
    // Validate familyId
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid family ID format' 
      });
    }
    
    // Format content blocks for MongoDB
    const formattedBlocks = (contentBlocks || []).map((block, index) => ({
      blockType: block.blockType || block.block_type,
      blockOrder: index,
      contentData: block.contentData || block.content_data || {}
    }));
    
    // Create or update page
    const page = await WebsitePage.findOneAndUpdate(
      { 
        familyId: new mongoose.Types.ObjectId(familyId),
        pageSlug: pageSlug
      },
      {
        familyId: new mongoose.Types.ObjectId(familyId),
        pageType: pageType,
        pageTitle: pageTitle,
        pageSlug: pageSlug,
        routePath: routePath,
        contentBlocks: formattedBlocks,
        updatedAt: Date.now()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    // Convert to format expected by frontend
    const pageObj = page.toObject();
    const formattedPage = {
      id: pageObj._id.toString(),
      family_id: pageObj.familyId.toString(),
      page_type: pageObj.pageType,
      page_title: pageObj.pageTitle,
      page_slug: pageObj.pageSlug,
      route_path: pageObj.routePath,
      is_published: pageObj.isPublished,
      published_at: pageObj.publishedAt,
      s3_key: pageObj.s3Key,
      s3_url: pageObj.s3Url,
      content_blocks: pageObj.contentBlocks || [],
      created_at: pageObj.createdAt,
      updated_at: pageObj.updatedAt
    };
    
    res.json({ success: true, page: formattedPage });
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/website-admin/pages/:pageId
 * Update a page
 */
router.put('/pages/:pageId', protect, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { pageTitle, routePath, contentBlocks } = req.body;
    
    // Validate pageId
    if (!mongoose.Types.ObjectId.isValid(pageId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid page ID format' 
      });
    }
    
    // Format content blocks for MongoDB
    const formattedBlocks = (contentBlocks || []).map((block, index) => ({
      blockType: block.blockType || block.block_type,
      blockOrder: index,
      contentData: block.contentData || block.content_data || {}
    }));
    
    // Update the page
    const page = await WebsitePage.findByIdAndUpdate(
      pageId,
      {
        pageTitle: pageTitle,
        routePath: routePath,
        contentBlocks: formattedBlocks,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }
    
    // Convert to format expected by frontend
    const pageObj = page.toObject();
    const formattedPage = {
      id: pageObj._id.toString(),
      family_id: pageObj.familyId.toString(),
      page_type: pageObj.pageType,
      page_title: pageObj.pageTitle,
      page_slug: pageObj.pageSlug,
      route_path: pageObj.routePath,
      is_published: pageObj.isPublished,
      published_at: pageObj.publishedAt,
      s3_key: pageObj.s3Key,
      s3_url: pageObj.s3Url,
      content_blocks: pageObj.contentBlocks || [],
      created_at: pageObj.createdAt,
      updated_at: pageObj.updatedAt
    };
    
    res.json({ success: true, page: formattedPage });
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/website-admin/pages/:pageId
 * Delete a page
 */
router.delete('/pages/:pageId', protect, async (req, res) => {
  try {
    const { pageId } = req.params;
    
    // Validate pageId
    if (!mongoose.Types.ObjectId.isValid(pageId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid page ID format' 
      });
    }
    
    const page = await WebsitePage.findByIdAndDelete(pageId);
    
    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }
    
    res.json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/website-admin/preview/:familyId
 * Generate preview of website (not published)
 * Only admins can generate websites
 */
router.post('/preview/:familyId', protect, hasPermission('canGenerateWebsite'), async (req, res) => {
  try {
    const { familyId } = req.params;
    
    // Validate familyId
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid family ID format' 
      });
    }
    
    // Get website config
    const configDoc = await WebsiteConfig.findOne({ 
      familyId: new mongoose.Types.ObjectId(familyId) 
    });
    
    if (!configDoc) {
      return res.status(404).json({ success: false, error: 'Website config not found' });
    }
    
    // Convert to format expected by buildStaticSite
    const configObj = configDoc.toObject();
    const config = {
      id: configObj._id.toString(),
      family_id: configObj.familyId.toString(),
      site_title: configObj.siteTitle,
      header_text: configObj.headerText,
      footer_text: configObj.footerText,
      theme: configObj.theme,
      layout: configObj.layout,
      logo_url: configObj.logoUrl,
      sample_image_url: configObj.sampleImageUrl,
      domain: configObj.domain,
      description: configObj.description,
      custom_pages: configObj.customPages,
      s3_bucket_name: configObj.s3BucketName,
      cloudfront_distribution_id: configObj.cloudfrontDistributionId,
      cloudfront_url: configObj.cloudfrontUrl,
      created_at: configObj.createdAt,
      updated_at: configObj.updatedAt
    };
    
    // Get all pages
    const pagesDocs = await WebsitePage.find({ 
      familyId: new mongoose.Types.ObjectId(familyId) 
    }).sort({ createdAt: 1 });
    
    // Convert to format expected by buildStaticSite
    let pages = pagesDocs.map(page => {
      const pageObj = page.toObject();
      return {
        id: pageObj._id.toString(),
        family_id: pageObj.familyId.toString(),
        page_type: pageObj.pageType,
        page_title: pageObj.pageTitle,
        page_slug: pageObj.pageSlug,
        route_path: pageObj.routePath,
        is_published: pageObj.isPublished,
        published_at: pageObj.publishedAt,
        s3_key: pageObj.s3Key,
        s3_url: pageObj.s3Url,
        content_blocks: pageObj.contentBlocks || [],
        created_at: pageObj.createdAt,
        updated_at: pageObj.updatedAt
      };
    });
    
    // Auto-generate bio pages for each family member
    const Member = require('../models/Member');
    const members = await Member.find({ 
      family: new mongoose.Types.ObjectId(familyId) 
    }).select('firstName lastName bio photo relationship dateOfBirth').lean();
    
    // Add bio pages for members with bios
    members.forEach(member => {
      if (member.bio && member.bio.trim()) {
        const memberSlug = `${member.firstName.toLowerCase().replace(/\s+/g, '-')}-${member.lastName ? member.lastName.toLowerCase().replace(/\s+/g, '-') : 'bio'}`;
        pages.push({
          id: `bio-${member._id.toString()}`,
          family_id: familyId,
          page_type: 'bio',
          page_title: `${member.firstName} ${member.lastName || ''} - Bio`,
          page_slug: memberSlug,
          route_path: `/bios/${memberSlug}`,
          is_published: true,
          content_blocks: [{
            blockType: 'text',
            blockOrder: 0,
            contentData: {
              title: `${member.firstName} ${member.lastName || ''}`,
              content: member.bio,
              photo: member.photo || '',
              relationship: member.relationship || '',
              dateOfBirth: member.dateOfBirth || ''
            }
          }]
        });
      }
    });
    
    // Auto-generate blog page
    const BlogPost = require('../models/BlogPost');
    const blogPosts = await BlogPost.find({ 
      family: new mongoose.Types.ObjectId(familyId),
      isPublished: true
    }).populate('author', 'firstName lastName').sort({ publishedAt: -1 }).limit(20).lean();
    
    if (blogPosts.length > 0 || true) { // Always create blog page
      pages.push({
        id: `blog-${familyId}`,
        family_id: familyId,
        page_type: 'blog',
        page_title: 'Family Blog',
        page_slug: 'blog',
        route_path: '/blog',
        is_published: true,
        content_blocks: blogPosts.map((post, index) => ({
          blockType: 'text',
          blockOrder: index,
          contentData: {
            title: post.title,
            content: post.excerpt || post.content.substring(0, 300) + '...',
            author: `${post.author.firstName} ${post.author.lastName || ''}`,
            date: post.publishedAt || post.createdAt,
            postId: post._id.toString()
          }
        }))
      });
    }
    
    // Generate preview HTML
    const previewResult = await generatePreview(familyId, config, pages);
    
    res.json({ 
      success: true, 
      previewUrl: previewResult.previewUrl, 
      localPath: previewResult.localPath,
      folderName: previewResult.folderName,
      folderPath: previewResult.folderPath,
      message: `Website generated successfully! Folder: ${previewResult.folderName}`
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/website-admin/publish/:familyId
 * Publish website to S3
 * Only admins can publish websites
 */
router.post('/publish/:familyId', protect, hasPermission('canGenerateWebsite'), async (req, res) => {
  try {
    const { familyId } = req.params;
    
    // Validate familyId
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid family ID format' 
      });
    }
    
    // Get website config
    const configDoc = await WebsiteConfig.findOne({ 
      familyId: new mongoose.Types.ObjectId(familyId) 
    });
    
    if (!configDoc) {
      return res.status(404).json({ success: false, error: 'Website config not found' });
    }
    
    // Convert to format expected by publishToS3
    const configObj = configDoc.toObject();
    const config = {
      id: configObj._id.toString(),
      family_id: configObj.familyId.toString(),
      site_title: configObj.siteTitle,
      header_text: configObj.headerText,
      footer_text: configObj.footerText,
      theme: configObj.theme,
      layout: configObj.layout,
      logo_url: configObj.logoUrl,
      sample_image_url: configObj.sampleImageUrl,
      domain: configObj.domain,
      description: configObj.description,
      custom_pages: configObj.customPages,
      s3_bucket_name: configObj.s3BucketName,
      cloudfront_distribution_id: configObj.cloudfrontDistributionId,
      cloudfront_url: configObj.cloudfrontUrl,
      created_at: configObj.createdAt,
      updated_at: configObj.updatedAt
    };
    
    // Get all pages
    const pagesDocs = await WebsitePage.find({ 
      familyId: new mongoose.Types.ObjectId(familyId) 
    }).sort({ createdAt: 1 });
    
    // Convert to format expected by publishToS3
    let pages = pagesDocs.map(page => {
      const pageObj = page.toObject();
      return {
        id: pageObj._id.toString(),
        family_id: pageObj.familyId.toString(),
        page_type: pageObj.pageType,
        page_title: pageObj.pageTitle,
        page_slug: pageObj.pageSlug,
        route_path: pageObj.routePath,
        is_published: pageObj.isPublished,
        published_at: pageObj.publishedAt,
        s3_key: pageObj.s3Key,
        s3_url: pageObj.s3Url,
        content_blocks: pageObj.contentBlocks || [],
        created_at: pageObj.createdAt,
        updated_at: pageObj.updatedAt
      };
    });
    
    // Auto-generate bio pages for each family member
    const Member = require('../models/Member');
    const members = await Member.find({ 
      family: new mongoose.Types.ObjectId(familyId) 
    }).select('firstName lastName bio photo relationship dateOfBirth').lean();
    
    // Add bio pages for members with bios
    members.forEach(member => {
      if (member.bio && member.bio.trim()) {
        const memberSlug = `${member.firstName.toLowerCase().replace(/\s+/g, '-')}-${member.lastName ? member.lastName.toLowerCase().replace(/\s+/g, '-') : 'bio'}`;
        pages.push({
          id: `bio-${member._id.toString()}`,
          family_id: familyId,
          page_type: 'bio',
          page_title: `${member.firstName} ${member.lastName || ''} - Bio`,
          page_slug: memberSlug,
          route_path: `/bios/${memberSlug}`,
          is_published: true,
          content_blocks: [{
            blockType: 'text',
            blockOrder: 0,
            contentData: {
              title: `${member.firstName} ${member.lastName || ''}`,
              content: member.bio,
              photo: member.photo || '',
              relationship: member.relationship || '',
              dateOfBirth: member.dateOfBirth || ''
            }
          }]
        });
      }
    });
    
    // Auto-generate blog page
    const BlogPost = require('../models/BlogPost');
    const blogPosts = await BlogPost.find({ 
      family: new mongoose.Types.ObjectId(familyId),
      isPublished: true
    }).populate('author', 'firstName lastName').sort({ publishedAt: -1 }).limit(20).lean();
    
    if (blogPosts.length > 0 || true) { // Always create blog page
      pages.push({
        id: `blog-${familyId}`,
        family_id: familyId,
        page_type: 'blog',
        page_title: 'Family Blog',
        page_slug: 'blog',
        route_path: '/blog',
        is_published: true,
        content_blocks: blogPosts.map((post, index) => ({
          blockType: 'text',
          blockOrder: index,
          contentData: {
            title: post.title,
            content: post.excerpt || post.content.substring(0, 300) + '...',
            author: `${post.author.firstName} ${post.author.lastName || ''}`,
            date: post.publishedAt || post.createdAt,
            postId: post._id.toString()
          }
        }))
      });
    }
    
    // Generate and publish to S3
    const publishResult = await publishToS3(familyId, config, pages);
    
    // Update pages as published
    await WebsitePage.updateMany(
      { familyId: new mongoose.Types.ObjectId(familyId) },
      {
        isPublished: true,
        publishedAt: Date.now(),
        s3Key: publishResult.s3Key,
        s3Url: publishResult.s3Url
      }
    );
    
    // Update website config with S3 info
    await WebsiteConfig.findOneAndUpdate(
      { familyId: new mongoose.Types.ObjectId(familyId) },
      {
        s3BucketName: publishResult.bucketName,
        cloudfrontUrl: publishResult.cloudfrontUrl,
        updatedAt: Date.now()
      }
    );
    
    res.json({ 
      success: true, 
      message: 'Website published successfully',
      s3Url: publishResult.s3Url,
      cloudfrontUrl: publishResult.cloudfrontUrl
    });
  } catch (error) {
    console.error('Error publishing website:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/website-admin/generate-with-ai/:familyId
 * Generate website automatically using Ollama AI based on customer details
 * Only admins can generate websites
 */
router.post('/generate-with-ai/:familyId', protect, hasPermission('canGenerateWebsite'), async (req, res) => {
  // Set a longer timeout for this route (15 minutes)
  req.setTimeout(900000); // 15 minutes
  res.setTimeout(900000);
  
  // Set headers to prevent connection timeout
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=900');
  
  try {
    const { familyId } = req.params;
    const { customerDetails } = req.body;
    
    console.log('🤖 AI Website Generation Request');
    console.log('  Family ID:', familyId);
    console.log('  Customer Details:', customerDetails);
    
    if (!customerDetails) {
      return res.status(400).json({ 
        success: false, 
        error: 'Customer details are required' 
      });
    }
    
    // Check if Ollama is running with timeout
    let ollamaStatus;
    try {
      ollamaStatus = await Promise.race([
        checkOllamaStatus(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ollama status check timed out')), 10000)
        )
      ]);
    } catch (statusError) {
      console.error('❌ Error checking Ollama status:', statusError);
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to Ollama. Please ensure Ollama is running: ollama serve',
        hint: 'Install Ollama from https://ollama.ai and run: ollama serve'
      });
    }
    if (!ollamaStatus.running) {
      return res.status(503).json({
        success: false,
        error: 'Ollama is not running. Please start Ollama: ollama serve',
        hint: 'Install Ollama from https://ollama.ai and run: ollama serve'
      });
    }
    
    // Check if the required model is available
    const requiredModel = process.env.OLLAMA_MODEL || 'llama3.2';
    const models = ollamaStatus.models || [];
    
    console.log('🔍 Checking for model:', requiredModel);
    console.log('📦 Available models from API:', JSON.stringify(models, null, 2));
    
    // Check if model exists (handle different name formats: "llama3.2", "llama3.2:latest", etc.)
    const hasModel = models.length > 0 && models.some(m => {
      const modelName = (m.name || m.model || '').toLowerCase();
      const searchModel = requiredModel.toLowerCase();
      return modelName === searchModel || 
             modelName.startsWith(searchModel + ':') ||
             modelName.includes(searchModel);
    });
    
    console.log('✅ Model found:', hasModel);
    
    // If no models are detected but Ollama is running, try anyway (model might be available but API hasn't refreshed)
    // Only block if we're certain the model doesn't exist
    if (!hasModel && models.length > 0) {
      // Model not found but other models exist - be more lenient, just log a warning
      console.warn(`⚠️  Model "${requiredModel}" not found in API list, but Ollama is running. Will attempt to use it anyway.`);
      console.warn(`Available models: ${models.map(m => m.name || m.model || 'unknown').join(', ')}`);
    } else if (!hasModel && models.length === 0) {
      // No models detected - but Ollama is running, so try anyway (might be a timing issue)
      console.warn(`⚠️  No models detected in API, but Ollama is running. Will attempt to use "${requiredModel}" anyway.`);
      console.warn('If generation fails, please ensure the model is installed: ollama pull ' + requiredModel);
    }
    
    // Validate familyId
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid family ID format' 
      });
    }
    
    // Get existing config if available (including uploaded images)
    let existingConfig = null;
    let uploadedImageUrl = null;
    try {
      const existingConfigDoc = await WebsiteConfig.findOne({ 
        familyId: new mongoose.Types.ObjectId(familyId) 
      });
      if (existingConfigDoc) {
        const configObj = existingConfigDoc.toObject();
        existingConfig = {
          site_title: configObj.siteTitle,
          header_text: configObj.headerText,
          footer_text: configObj.footerText,
          theme: configObj.theme
        };
        // Get uploaded sample image URL if available
        uploadedImageUrl = configObj.sampleImageUrl || null;
        console.log('📸 Found uploaded image:', uploadedImageUrl);
      }
    } catch (error) {
      console.log('No existing config found, will create new one');
    }
    
    // Pass uploaded image to customerDetails for Ollama to use
    if (uploadedImageUrl) {
      customerDetails.uploadedImageUrl = uploadedImageUrl;
      customerDetails.heroImageUrl = uploadedImageUrl; // Explicit hero image
    }
    
    // Generate website structure using AI (with image info)
    console.log('🤖 Generating website structure with Ollama...');
    
    // Check if client disconnected
    req.on('close', () => {
      console.log('⚠️  Client disconnected during AI generation');
    });
    
    let websiteStructure;
    try {
      websiteStructure = await generateWebsiteStructure(customerDetails);
    } catch (genError) {
      // Check if it's a network/connection error
      if (genError.message && (
        genError.message.includes('ECONNREFUSED') ||
        genError.message.includes('timeout') ||
        genError.message.includes('ETIMEDOUT') ||
        genError.message.includes('network')
      )) {
        console.error('❌ Network error during generation:', genError.message);
        return res.status(503).json({
          success: false,
          error: 'Network error during AI generation. Please check if Ollama is running and try again.',
          details: genError.message
        });
      }
      throw genError; // Re-throw if not a network error
    }
    
    if (!websiteStructure.pages || !Array.isArray(websiteStructure.pages)) {
      throw new Error('Invalid website structure generated by AI');
    }
    
    // Save website configuration - prioritize form values, then AI-generated, then fallbacks
    const aiConfig = websiteStructure.websiteConfig || {};
    // Priority: customerDetails (form values) > existingConfig > aiConfig > fallbacks
    const finalSiteTitle = customerDetails.familyName || customerDetails.siteTitle || existingConfig?.site_title || aiConfig.siteTitle || 'Family Portal';
    const finalHeaderText = customerDetails.description || customerDetails.headerText || existingConfig?.header_text || aiConfig.headerText || `Welcome to ${finalSiteTitle}`;
    const finalFooterText = customerDetails.additionalInfo || customerDetails.footerText || existingConfig?.footer_text || aiConfig.footerText || `© ${new Date().getFullYear()} ${finalSiteTitle}. All rights reserved.`;
    const finalTheme = customerDetails.theme || existingConfig?.theme || aiConfig.theme || 'light';
    
    await WebsiteConfig.findOneAndUpdate(
      { familyId: new mongoose.Types.ObjectId(familyId) },
      {
        siteTitle: finalSiteTitle,
        headerText: finalHeaderText,
        footerText: finalFooterText,
        theme: finalTheme,
        updatedAt: Date.now()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    // Create pages with content blocks
    const createdPages = [];
    for (const pageData of websiteStructure.pages) {
      // Format content blocks
      const formattedBlocks = (pageData.contentBlocks || []).map((block, index) => ({
        blockType: block.blockType || block.block_type,
        blockOrder: index,
        contentData: block.contentData || block.content_data || {}
      }));
      
      // Create or update page
      const page = await WebsitePage.findOneAndUpdate(
        { 
          familyId: new mongoose.Types.ObjectId(familyId),
          pageSlug: pageData.pageSlug || pageData.pageTitle.toLowerCase().replace(/\s+/g, '-')
        },
        {
          familyId: new mongoose.Types.ObjectId(familyId),
          pageType: pageData.pageType || 'custom',
          pageTitle: pageData.pageTitle,
          pageSlug: pageData.pageSlug || pageData.pageTitle.toLowerCase().replace(/\s+/g, '-'),
          routePath: pageData.routePath || `/${pageData.pageSlug || pageData.pageTitle.toLowerCase().replace(/\s+/g, '-')}`,
          contentBlocks: formattedBlocks,
          updatedAt: Date.now()
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );
      
      // Convert to format expected by frontend
      const pageObj = page.toObject();
      const formattedPage = {
        id: pageObj._id.toString(),
        family_id: pageObj.familyId.toString(),
        page_type: pageObj.pageType,
        page_title: pageObj.pageTitle,
        page_slug: pageObj.pageSlug,
        route_path: pageObj.routePath,
        is_published: pageObj.isPublished,
        published_at: pageObj.publishedAt,
        s3_key: pageObj.s3Key,
        s3_url: pageObj.s3Url,
        content_blocks: pageObj.contentBlocks || [],
        created_at: pageObj.createdAt,
        updated_at: pageObj.updatedAt
      };
      
      createdPages.push(formattedPage);
    }
    
    console.log(`✅ AI Generated ${createdPages.length} pages successfully`);
    
    res.json({
      success: true,
      message: `Website generated successfully with ${createdPages.length} pages`,
      pagesCreated: createdPages.length,
      pages: createdPages
    });
    
  } catch (error) {
    console.error('❌ Error generating website with AI:', error);
    console.error('Error stack:', error.stack);
    
    // Check if response was already sent
    if (res.headersSent) {
      console.error('⚠️  Response already sent, cannot send error response');
      return;
    }
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Unknown error occurred';
    let errorDetails = null;
    let statusCode = 500;
    
    // Check for specific error types
    if (error.message && (
      error.message.includes('ECONNREFUSED') || 
      error.message.includes('Ollama is not running') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT')
    )) {
      errorMessage = 'Ollama connection error. Please ensure Ollama is running.';
      const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
      errorDetails = `Make sure Ollama is installed and running. ${process.env.NODE_ENV === 'production' ? 'Check OLLAMA_API_URL environment variable.' : `Default URL: ${ollamaUrl}`}`;
      statusCode = 503;
    } else if (error.message && error.message.includes('Invalid JSON')) {
      errorMessage = 'AI generated invalid response. Please try again.';
      errorDetails = error.message;
    } else if (error.message.includes('Invalid JSON')) {
      errorMessage = 'AI generated invalid response. Please try again.';
      errorDetails = error.message;
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: errorDetails || error.message,
      hint: errorDetails ? errorDetails : 'Check backend console for more details'
    });
  }
});

/**
 * GET /api/website-admin/ollama-status
 * Check if Ollama is running and available
 */
router.get('/ollama-status', protect, async (req, res) => {
  try {
    const status = await checkOllamaStatus();
    res.json({
      success: true,
      ollama: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to generate preview
async function generatePreview(familyId, config, pages) {
  const { buildStaticSite } = require('../services/websiteGenerator');
  const path = require('path');
  const fs = require('fs');
  
  try {
    // Build static site locally
    const buildResult = await buildStaticSite(familyId, config, pages);
    
    // Handle both old format (string) and new format (object)
    const localDir = typeof buildResult === 'string' ? buildResult : buildResult.directory;
    const folderName = typeof buildResult === 'string' ? path.basename(localDir) : buildResult.folderName;
    
    // Return preview URL that will be served by Express static middleware
    const previewUrl = `/preview/${folderName}/index.html`;
    
    return {
      previewUrl: previewUrl,
      localPath: localDir,
      folderName: folderName,
      folderPath: localDir
    };
  } catch (error) {
    console.error('Error generating preview:', error);
    throw error;
  }
}

module.exports = router;
