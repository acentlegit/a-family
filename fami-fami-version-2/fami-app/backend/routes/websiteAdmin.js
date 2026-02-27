const express = require('express');
const router = express.Router();
const { query } = require('../database/pgClient');
const { buildStaticSite } = require('../services/websiteGenerator');
const { publishToS3 } = require('../services/s3Publisher');
const { protect } = require('../middleware/auth');
const { generateWebsiteStructure, checkOllamaStatus } = require('../services/ollamaService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
    
    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS website_configs (
        id SERIAL PRIMARY KEY,
        family_id VARCHAR(255) UNIQUE NOT NULL,
        site_title VARCHAR(255),
        header_text TEXT,
        footer_text TEXT,
        theme VARCHAR(50) DEFAULT 'light',
        layout VARCHAR(50) DEFAULT 'sidebar',
        logo_url TEXT,
        sample_image_url TEXT,
        domain VARCHAR(255),
        description TEXT,
        custom_pages TEXT,
        s3_bucket_name VARCHAR(255),
        cloudfront_distribution_id VARCHAR(255),
        cloudfront_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add sample_image_url column if it doesn't exist (for existing tables)
    try {
      await query(`ALTER TABLE website_configs ADD COLUMN IF NOT EXISTS sample_image_url TEXT`);
    } catch (e) {
      // Column might already exist, ignore error
    }
    
    // Ensure all columns exist (for existing tables that might be missing columns)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_configs' AND column_name = 'description') THEN
          ALTER TABLE website_configs ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_configs' AND column_name = 'custom_pages') THEN
          ALTER TABLE website_configs ADD COLUMN custom_pages TEXT;
        END IF;
      END $$;
    `);
    
    const result = await query(
      'SELECT * FROM website_configs WHERE family_id = $1',
      [familyId]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: true, config: null });
    }
    
    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Error fetching website config:', error);
    
    // Check if it's a PostgreSQL connection error
    if (error.code === 'PG_UNAVAILABLE' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
        error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout') ||
        error.originalError?.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL database is not available. Please start PostgreSQL to use website admin features.',
        message: 'Database connection refused. Please ensure PostgreSQL is running.',
        hint: 'Start PostgreSQL using: docker-compose -f docker-compose.postgres.yml up -d or install and start PostgreSQL service'
      });
    }
    
    // Check for database not found
    if (error.code === 'PG_DATABASE_NOT_FOUND' || error.code === '3D000') {
      return res.status(503).json({ 
        success: false, 
        error: 'Database does not exist. Please create the database.',
        message: error.message || 'Database family_portal does not exist.',
        hint: 'Create database: CREATE DATABASE family_portal;'
      });
    }
    
    // Check for authentication errors
    if (error.code === 'PG_AUTH_FAILED' || error.code === '28P01') {
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL authentication failed.',
        message: 'Please check your database credentials in .env file.',
        hint: 'Verify PG_USER and PG_PASSWORD in backend/.env'
      });
    }
    
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
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
    
    // Test PostgreSQL connection first
    const { isPostgreSQLAvailable } = require('../database/pgClient');
    const pgAvailable = await isPostgreSQLAvailable();
    if (!pgAvailable) {
      console.error('❌ PostgreSQL is not available');
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL database is not available. Please ensure PostgreSQL is running.',
        message: 'Database connection failed. Please check if PostgreSQL is running.',
        hint: 'Start PostgreSQL using: docker-compose -f docker-compose.postgres.yml up -d'
      });
    }
    
    // First, ensure the website_configs table exists
    await query(`
      CREATE TABLE IF NOT EXISTS website_configs (
        id SERIAL PRIMARY KEY,
        family_id VARCHAR(255) UNIQUE NOT NULL,
        site_title VARCHAR(255),
        header_text TEXT,
        footer_text TEXT,
        theme VARCHAR(50) DEFAULT 'light',
        layout VARCHAR(50) DEFAULT 'sidebar',
        logo_url TEXT,
        sample_image_url TEXT,
        domain VARCHAR(255),
        description TEXT,
        custom_pages TEXT,
        s3_bucket_name VARCHAR(255),
        cloudfront_distribution_id VARCHAR(255),
        cloudfront_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add sample_image_url column if it doesn't exist (for existing tables)
    try {
      await query(`ALTER TABLE website_configs ADD COLUMN IF NOT EXISTS sample_image_url TEXT`);
    } catch (e) {
      // Column might already exist, ignore error
    }
    
    // Ensure all columns exist (for existing tables that might be missing columns)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_configs' AND column_name = 'description') THEN
          ALTER TABLE website_configs ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_configs' AND column_name = 'custom_pages') THEN
          ALTER TABLE website_configs ADD COLUMN custom_pages TEXT;
        END IF;
      END $$;
    `);
    
    // Use familyId as string (MongoDB ObjectId) instead of integer
    const result = await query(
      `INSERT INTO website_configs 
       (family_id, site_title, header_text, footer_text, theme, layout, logo_url, sample_image_url, domain, description, custom_pages, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
       ON CONFLICT (family_id) 
       DO UPDATE SET 
         site_title = EXCLUDED.site_title,
         header_text = EXCLUDED.header_text,
         footer_text = EXCLUDED.footer_text,
         theme = EXCLUDED.theme,
         layout = EXCLUDED.layout,
         logo_url = EXCLUDED.logo_url,
         sample_image_url = EXCLUDED.sample_image_url,
         domain = EXCLUDED.domain,
         description = EXCLUDED.description,
         custom_pages = EXCLUDED.custom_pages,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [familyId, siteTitle || '', headerText || '', footerText || '', theme || 'light', layout || 'sidebar', logoUrl || '', sampleImageUrl || '', domain || '', description || '', customPages || '']
    );
    
    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('❌ Error saving website config:', error);
    console.error('  Error code:', error.code);
    console.error('  Error message:', error.message);
    console.error('  Error stack:', error.stack);
    
    // Check if it's a PostgreSQL connection error
    if (error.code === 'PG_UNAVAILABLE' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
        error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout') ||
        error.originalError?.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL database is not available. Please start PostgreSQL to use website admin features.',
        message: 'Database connection refused. Please ensure PostgreSQL is running.',
        hint: 'Start PostgreSQL using: docker-compose -f docker-compose.postgres.yml up -d'
      });
    }
    
    // Check for database not found (specific error code)
    if (error.code === 'PG_DATABASE_NOT_FOUND' || error.code === '3D000') {
      return res.status(503).json({ 
        success: false, 
        error: 'Database does not exist. Please create the database.',
        message: error.message || 'Database family_portal does not exist.',
        hint: 'Create database: CREATE DATABASE family_portal;'
      });
    }
    
    // Check for authentication errors
    if (error.code === 'PG_AUTH_FAILED' || error.code === '28P01') {
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL authentication failed.',
        message: 'Please check your database credentials in .env file.',
        hint: 'Verify PG_USER and PG_PASSWORD in backend/.env'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error',
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

    const logoUrl = `/uploads/website-logos/${req.file.filename}`;
    const getBaseUrl = require('../utils/getBaseUrl');
    const baseUrl = getBaseUrl();
    const fullLogoUrl = `${baseUrl}${logoUrl}`;

    // Ensure the website_configs table exists
    await query(`
      CREATE TABLE IF NOT EXISTS website_configs (
        id SERIAL PRIMARY KEY,
        family_id VARCHAR(255) UNIQUE NOT NULL,
        site_title VARCHAR(255),
        header_text TEXT,
        footer_text TEXT,
        theme VARCHAR(50) DEFAULT 'light',
        layout VARCHAR(50) DEFAULT 'sidebar',
        logo_url TEXT,
        domain VARCHAR(255),
        description TEXT,
        custom_pages TEXT,
        s3_bucket_name VARCHAR(255),
        cloudfront_distribution_id VARCHAR(255),
        cloudfront_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Ensure all columns exist (for existing tables that might be missing columns)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_configs' AND column_name = 'description') THEN
          ALTER TABLE website_configs ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_configs' AND column_name = 'custom_pages') THEN
          ALTER TABLE website_configs ADD COLUMN custom_pages TEXT;
        END IF;
      END $$;
    `);

    // Update the website_configs table with the new logo URL
    const result = await query(`
      INSERT INTO website_configs (family_id, logo_url, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (family_id)
      DO UPDATE SET
        logo_url = EXCLUDED.logo_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [familyId, fullLogoUrl]);

    res.json({ success: true, message: 'Logo uploaded and saved successfully', logoUrl: fullLogoUrl });
  } catch (error) {
    console.error('Error uploading logo:', error);
    console.error('Error details:', { code: error.code, message: error.message, stack: error.stack });
    
    // Check if it's a PostgreSQL connection error
    if (error.code === 'PG_UNAVAILABLE' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
        error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout') ||
        error.originalError?.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL database is not available. Please start PostgreSQL to use website admin features.',
        message: 'Database connection refused. Please ensure PostgreSQL is running.',
        hint: 'Start PostgreSQL using: docker-compose -f docker-compose.postgres.yml up -d or install and start PostgreSQL service'
      });
    }
    
    // Check for database not found
    if (error.code === 'PG_DATABASE_NOT_FOUND' || error.code === '3D000') {
      return res.status(503).json({ 
        success: false, 
        error: 'Database does not exist. Please create the database.',
        message: error.message || 'Database family_portal does not exist.',
        hint: 'Create database: CREATE DATABASE family_portal;'
      });
    }
    
    // Check for authentication errors
    if (error.code === 'PG_AUTH_FAILED' || error.code === '28P01') {
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL authentication failed.',
        message: 'Please check your database credentials in .env file.',
        hint: 'Verify PG_USER and PG_PASSWORD in backend/.env'
      });
    }
    
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

    const imageUrl = `/uploads/sample-images/${req.file.filename}`;
    const getBaseUrl = require('../utils/getBaseUrl');
    const baseUrl = getBaseUrl();
    const fullImageUrl = `${baseUrl}${imageUrl}`;

    // Ensure the website_configs table exists
    await query(`
      CREATE TABLE IF NOT EXISTS website_configs (
        id SERIAL PRIMARY KEY,
        family_id VARCHAR(255) UNIQUE NOT NULL,
        site_title VARCHAR(255),
        header_text TEXT,
        footer_text TEXT,
        theme VARCHAR(50) DEFAULT 'light',
        layout VARCHAR(50) DEFAULT 'sidebar',
        logo_url TEXT,
        sample_image_url TEXT,
        domain VARCHAR(255),
        description TEXT,
        custom_pages TEXT,
        s3_bucket_name VARCHAR(255),
        cloudfront_distribution_id VARCHAR(255),
        cloudfront_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add sample_image_url column if it doesn't exist
    try {
      await query(`ALTER TABLE website_configs ADD COLUMN IF NOT EXISTS sample_image_url TEXT`);
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Update the website_configs table with the new sample image URL
    const result = await query(`
      INSERT INTO website_configs (family_id, sample_image_url, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (family_id)
      DO UPDATE SET
        sample_image_url = EXCLUDED.sample_image_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [familyId, fullImageUrl]);

    res.json({ success: true, message: 'Sample image uploaded and saved successfully', imageUrl: fullImageUrl });
  } catch (error) {
    console.error('Error uploading sample image:', error);
    
    // Check if it's a PostgreSQL connection error
    if (error.code === 'PG_UNAVAILABLE' || error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL database is not available. Please start PostgreSQL to use website admin features.',
        message: 'Database connection refused. Please ensure PostgreSQL is running.',
        hint: 'Start PostgreSQL using: docker-compose -f docker-compose.postgres.yml up -d or install and start PostgreSQL service'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload sample image'
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

    const imageUrl = `/uploads/sample-images/${req.file.filename}`;
    const getBaseUrl = require('../utils/getBaseUrl');
    const baseUrl = getBaseUrl();
    const fullImageUrl = `${baseUrl}${imageUrl}`;

    // Ensure the website_configs table exists
    await query(`
      CREATE TABLE IF NOT EXISTS website_configs (
        id SERIAL PRIMARY KEY,
        family_id VARCHAR(255) UNIQUE NOT NULL,
        site_title VARCHAR(255),
        header_text TEXT,
        footer_text TEXT,
        theme VARCHAR(50) DEFAULT 'light',
        layout VARCHAR(50) DEFAULT 'sidebar',
        logo_url TEXT,
        sample_image_url TEXT,
        domain VARCHAR(255),
        description TEXT,
        custom_pages TEXT,
        s3_bucket_name VARCHAR(255),
        cloudfront_distribution_id VARCHAR(255),
        cloudfront_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add sample_image_url column if it doesn't exist
    try {
      await query(`ALTER TABLE website_configs ADD COLUMN IF NOT EXISTS sample_image_url TEXT`);
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Update the website_configs table with the new sample image URL
    const result = await query(`
      INSERT INTO website_configs (family_id, sample_image_url, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (family_id)
      DO UPDATE SET
        sample_image_url = EXCLUDED.sample_image_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [familyId, fullImageUrl]);

    res.json({ success: true, message: 'Sample image uploaded and saved successfully', imageUrl: fullImageUrl });
  } catch (error) {
    console.error('Error uploading sample image:', error);
    
    // Check if it's a PostgreSQL connection error
    if (error.code === 'PG_UNAVAILABLE' || error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL database is not available. Please start PostgreSQL to use website admin features.',
        message: 'Database connection refused. Please ensure PostgreSQL is running.',
        hint: 'Start PostgreSQL using: docker-compose -f docker-compose.postgres.yml up -d or install and start PostgreSQL service'
      });
    }
    
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
    
    // Ensure tables exist
    await query(`
      CREATE TABLE IF NOT EXISTS website_pages (
        id SERIAL PRIMARY KEY,
        family_id VARCHAR(255) NOT NULL,
        page_type VARCHAR(100) NOT NULL,
        page_title VARCHAR(255) NOT NULL,
        page_slug VARCHAR(255) NOT NULL,
        route_path VARCHAR(255) NOT NULL,
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP,
        s3_key TEXT,
        s3_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(family_id, page_slug)
      )
    `);
    
    await query(`
      CREATE TABLE IF NOT EXISTS page_content_blocks (
        id SERIAL PRIMARY KEY,
        page_id INTEGER REFERENCES website_pages(id) ON DELETE CASCADE,
        block_type VARCHAR(50) NOT NULL,
        block_order INTEGER DEFAULT 0,
        content_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const result = await query(
      `SELECT wp.*, 
       (SELECT json_agg(pcb ORDER BY pcb.block_order) 
        FROM page_content_blocks pcb 
        WHERE pcb.page_id = wp.id) as content_blocks
       FROM website_pages wp
       WHERE wp.family_id = $1
       ORDER BY wp.created_at`,
      [familyId]
    );
    
    res.json({ success: true, pages: result.rows });
  } catch (error) {
    console.error('Error fetching pages:', error);
    
    // Check if it's a PostgreSQL connection error
    if (error.code === 'PG_UNAVAILABLE' || error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ 
        success: false, 
        error: 'PostgreSQL database is not available. Please start PostgreSQL to use website admin features.',
        message: 'Database connection refused. Please ensure PostgreSQL is running.',
        hint: 'Start PostgreSQL using: docker-compose -f docker-compose.postgres.yml up -d',
        pages: [] // Return empty array so frontend doesn't break
      });
    }
    
    res.status(500).json({ success: false, error: error.message });
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
    
    // Ensure tables exist
    await query(`
      CREATE TABLE IF NOT EXISTS website_pages (
        id SERIAL PRIMARY KEY,
        family_id VARCHAR(255) NOT NULL,
        page_type VARCHAR(100) NOT NULL,
        page_title VARCHAR(255) NOT NULL,
        page_slug VARCHAR(255) NOT NULL,
        route_path VARCHAR(255) NOT NULL,
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP,
        s3_key TEXT,
        s3_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(family_id, page_slug)
      )
    `);
    
    await query(`
      CREATE TABLE IF NOT EXISTS page_content_blocks (
        id SERIAL PRIMARY KEY,
        page_id INTEGER REFERENCES website_pages(id) ON DELETE CASCADE,
        block_type VARCHAR(50) NOT NULL,
        block_order INTEGER DEFAULT 0,
        content_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create the page
    const pageResult = await query(
      `INSERT INTO website_pages 
       (family_id, page_type, page_title, page_slug, route_path, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (family_id, page_slug) 
       DO UPDATE SET 
         page_title = EXCLUDED.page_title,
         route_path = EXCLUDED.route_path,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [familyId, pageType, pageTitle, pageSlug, routePath]
    );
    
    const page = pageResult.rows[0];
    
    // Add content blocks if provided
    if (contentBlocks && Array.isArray(contentBlocks)) {
      // Delete existing blocks
      await query('DELETE FROM page_content_blocks WHERE page_id = $1', [page.id]);
      
      // Insert new blocks
      for (let i = 0; i < contentBlocks.length; i++) {
        const block = contentBlocks[i];
        await query(
          `INSERT INTO page_content_blocks 
           (page_id, block_type, block_order, content_data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [page.id, block.blockType, i, JSON.stringify(block.contentData)]
        );
      }
    }
    
    // Fetch the page with content blocks
    const fullPageResult = await query(
      `SELECT wp.*, 
       (SELECT json_agg(pcb ORDER BY pcb.block_order) 
        FROM page_content_blocks pcb 
        WHERE pcb.page_id = wp.id) as content_blocks
       FROM website_pages wp
       WHERE wp.id = $1`,
      [page.id]
    );
    
    res.json({ success: true, page: fullPageResult.rows[0] });
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
    
    // Update the page
    await query(
      `UPDATE website_pages 
       SET page_title = $1, route_path = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [pageTitle, routePath, pageId]
    );
    
    // Update content blocks
    if (contentBlocks && Array.isArray(contentBlocks)) {
      // Delete existing blocks
      await query('DELETE FROM page_content_blocks WHERE page_id = $1', [pageId]);
      
      // Insert new blocks
      for (let i = 0; i < contentBlocks.length; i++) {
        const block = contentBlocks[i];
        await query(
          `INSERT INTO page_content_blocks 
           (page_id, block_type, block_order, content_data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [pageId, block.blockType, i, JSON.stringify(block.contentData)]
        );
      }
    }
    
    // Fetch updated page
    const result = await query(
      `SELECT wp.*, 
       (SELECT json_agg(pcb ORDER BY pcb.block_order) 
        FROM page_content_blocks pcb 
        WHERE pcb.page_id = wp.id) as content_blocks
       FROM website_pages wp
       WHERE wp.id = $1`,
      [pageId]
    );
    
    res.json({ success: true, page: result.rows[0] });
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
    
    await query('DELETE FROM website_pages WHERE id = $1', [pageId]);
    
    res.json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/website-admin/preview/:familyId
 * Generate preview of website (not published)
 */
router.post('/preview/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    
    // Get website config
    const configResult = await query(
      'SELECT * FROM website_configs WHERE family_id = $1',
      [familyId]
    );
    
    if (configResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Website config not found' });
    }
    
    const config = configResult.rows[0];
    
    // Get all pages
    const pagesResult = await query(
      `SELECT wp.*, 
       (SELECT json_agg(pcb ORDER BY pcb.block_order) 
        FROM page_content_blocks pcb 
        WHERE pcb.page_id = wp.id) as content_blocks
       FROM website_pages wp
       WHERE wp.family_id = $1
       ORDER BY wp.created_at`,
      [familyId]
    );
    
    const pages = pagesResult.rows;
    
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
 */
router.post('/publish/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    
    // Get website config
    const configResult = await query(
      'SELECT * FROM website_configs WHERE family_id = $1',
      [familyId]
    );
    
    if (configResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Website config not found' });
    }
    
    const config = configResult.rows[0];
    
    // Get all pages
    const pagesResult = await query(
      `SELECT wp.*, 
       (SELECT json_agg(pcb ORDER BY pcb.block_order) 
        FROM page_content_blocks pcb 
        WHERE pcb.page_id = wp.id) as content_blocks
       FROM website_pages wp
       WHERE wp.family_id = $1
       ORDER BY wp.created_at`,
      [familyId]
    );
    
    const pages = pagesResult.rows;
    
    // Generate and publish to S3
    const publishResult = await publishToS3(familyId, config, pages);
    
    // Update pages as published
    await query(
      `UPDATE website_pages 
       SET is_published = true, published_at = CURRENT_TIMESTAMP, s3_key = $1, s3_url = $2
       WHERE family_id = $3`,
      [publishResult.s3Key, publishResult.s3Url, familyId]
    );
    
    // Update website config with S3 info
    await query(
      `UPDATE website_configs 
       SET s3_bucket_name = $1, cloudfront_url = $2, updated_at = CURRENT_TIMESTAMP
       WHERE family_id = $3`,
      [publishResult.bucketName, publishResult.cloudfrontUrl, familyId]
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
 */
router.post('/generate-with-ai/:familyId', protect, async (req, res) => {
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
    
    // Check if Ollama is running
    const ollamaStatus = await checkOllamaStatus();
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
    
    // Generate website structure using AI
    console.log('🤖 Generating website structure with Ollama...');
    const websiteStructure = await generateWebsiteStructure(customerDetails);
    
    if (!websiteStructure.pages || !Array.isArray(websiteStructure.pages)) {
      throw new Error('Invalid website structure generated by AI');
    }
    
    // Ensure tables exist
    await query(`
      CREATE TABLE IF NOT EXISTS website_configs (
        id SERIAL PRIMARY KEY,
        family_id VARCHAR(255) UNIQUE NOT NULL,
        site_title VARCHAR(255),
        header_text TEXT,
        footer_text TEXT,
        theme VARCHAR(50) DEFAULT 'light',
        layout VARCHAR(50) DEFAULT 'sidebar',
        logo_url TEXT,
        domain VARCHAR(255),
        description TEXT,
        custom_pages TEXT,
        s3_bucket_name VARCHAR(255),
        cloudfront_distribution_id VARCHAR(255),
        cloudfront_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Ensure all columns exist (for existing tables that might be missing columns)
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_configs' AND column_name = 'description') THEN
          ALTER TABLE website_configs ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_configs' AND column_name = 'custom_pages') THEN
          ALTER TABLE website_configs ADD COLUMN custom_pages TEXT;
        END IF;
      END $$;
    `);
    
    await query(`
      CREATE TABLE IF NOT EXISTS website_pages (
        id SERIAL PRIMARY KEY,
        family_id VARCHAR(255) NOT NULL,
        page_type VARCHAR(100) NOT NULL,
        page_title VARCHAR(255) NOT NULL,
        page_slug VARCHAR(255) NOT NULL,
        route_path VARCHAR(255) NOT NULL,
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP,
        s3_key TEXT,
        s3_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(family_id, page_slug)
      )
    `);
    
    await query(`
      CREATE TABLE IF NOT EXISTS page_content_blocks (
        id SERIAL PRIMARY KEY,
        page_id INTEGER REFERENCES website_pages(id) ON DELETE CASCADE,
        block_type VARCHAR(50) NOT NULL,
        block_order INTEGER DEFAULT 0,
        content_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get existing config if available
    let existingConfig = null;
    try {
      const existingConfigResult = await query(
        'SELECT * FROM website_configs WHERE family_id = $1',
        [familyId]
      );
      if (existingConfigResult.rows.length > 0) {
        existingConfig = existingConfigResult.rows[0];
      }
    } catch (error) {
      console.log('No existing config found, will create new one');
    }
    
    // Save website configuration - preserve existing values, use AI-generated as fallback
    const aiConfig = websiteStructure.websiteConfig || {};
    const finalSiteTitle = existingConfig?.site_title || aiConfig.siteTitle || customerDetails.familyName || 'Family Portal';
    const finalHeaderText = existingConfig?.header_text || aiConfig.headerText || customerDetails.description || `Welcome to ${finalSiteTitle}`;
    const finalFooterText = existingConfig?.footer_text || aiConfig.footerText || customerDetails.additionalInfo || `© ${new Date().getFullYear()} ${finalSiteTitle}. All rights reserved.`;
    const finalTheme = existingConfig?.theme || aiConfig.theme || customerDetails.theme || 'light';
    
    await query(`
      INSERT INTO website_configs 
      (family_id, site_title, header_text, footer_text, theme, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (family_id) 
      DO UPDATE SET 
        site_title = EXCLUDED.site_title,
        header_text = EXCLUDED.header_text,
        footer_text = EXCLUDED.footer_text,
        theme = EXCLUDED.theme,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      familyId,
      finalSiteTitle,
      finalHeaderText,
      finalFooterText,
      finalTheme
    ]);
    
    // Create pages with content blocks
    const createdPages = [];
    for (const pageData of websiteStructure.pages) {
      // Create page
      const pageResult = await query(`
        INSERT INTO website_pages 
        (family_id, page_type, page_title, page_slug, route_path, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (family_id, page_slug) 
        DO UPDATE SET 
          page_title = EXCLUDED.page_title,
          route_path = EXCLUDED.route_path,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        familyId,
        pageData.pageType || 'custom',
        pageData.pageTitle,
        pageData.pageSlug || pageData.pageTitle.toLowerCase().replace(/\s+/g, '-'),
        pageData.routePath || `/${pageData.pageSlug || pageData.pageTitle.toLowerCase().replace(/\s+/g, '-')}`
      ]);
      
      const page = pageResult.rows[0];
      
      // Add content blocks
      if (pageData.contentBlocks && Array.isArray(pageData.contentBlocks)) {
        // Delete existing blocks
        await query('DELETE FROM page_content_blocks WHERE page_id = $1', [page.id]);
        
        // Insert new blocks
        for (let i = 0; i < pageData.contentBlocks.length; i++) {
          const block = pageData.contentBlocks[i];
          await query(`
            INSERT INTO page_content_blocks 
            (page_id, block_type, block_order, content_data, created_at, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            page.id,
            block.blockType || block.block_type,
            i,
            JSON.stringify(block.contentData || block.content_data || {})
          ]);
        }
      }
      
      createdPages.push(page);
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
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Unknown error occurred';
    let errorDetails = null;
    
    // Check for specific error types
    if (error.message.includes('ECONNREFUSED') || error.message.includes('Ollama is not running')) {
      errorMessage = 'Ollama is not running. Please start Ollama: ollama serve';
      errorDetails = 'Make sure Ollama is installed and running on http://localhost:11434';
    } else if (error.message.includes('PostgreSQL') || error.message.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
      errorMessage = 'PostgreSQL database is not available. Please start PostgreSQL.';
      errorDetails = 'Run: docker-compose -f docker-compose.postgres.yml up -d';
    } else if (error.message.includes('Invalid JSON')) {
      errorMessage = 'AI generated invalid response. Please try again.';
      errorDetails = error.message;
    }
    
    res.status(500).json({ 
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
