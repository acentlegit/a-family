const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

// ============================================================================
// DEPLOYMENT CONFIGURATION
// ============================================================================
// For production deployment, you can either:
// 1. Use environment variables (recommended for security)
// 2. Use IAM roles (best for EC2/ECS - no credentials needed)
// 3. Hardcode credentials here (quick but less secure)

// OPTION 1: Hardcoded S3 Configuration (uncomment and fill in for simple deployment)
const HARDCODED_S3_CONFIG = {
  enabled: false, // Set to true to use hardcoded config
  bucket: 'your-bucket-name', // Your S3 bucket name
  region: 'us-east-1', // Your AWS region
  // Leave these empty to use IAM roles (recommended for EC2/ECS)
  accessKeyId: '', // Your AWS Access Key ID (optional if using IAM roles)
  secretAccessKey: '' // Your AWS Secret Access Key (optional if using IAM roles)
};

// ============================================================================

// Check if system-wide S3 is configured
const isSystemS3Configured = () => {
  // Check hardcoded config first
  if (HARDCODED_S3_CONFIG.enabled && HARDCODED_S3_CONFIG.bucket) {
    return true;
  }
  
  // Check environment variables
  const isConfigured = !!(
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_REGION
  );
  
  if (!isConfigured) {
    return false;
  }
  
  // Check if bucket name or credentials are placeholders
  const hasPlaceholders = 
    process.env.AWS_S3_BUCKET.includes('your-') ||
    process.env.AWS_S3_BUCKET.includes('bucket-name') ||
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID.includes('your_')) ||
    (process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY.includes('your_'));
  
  return !hasPlaceholders;
};

// Check if user has their own S3 configured
const isUserS3Configured = (user) => {
  return !!(
    user &&
    user.s3Config &&
    user.s3Config.enabled &&
    user.s3Config.accessKeyId &&
    user.s3Config.secretAccessKey &&
    user.s3Config.bucket
  );
};

// Get S3 client (system or user-specific)
const getS3Client = (user = null) => {
  // Priority 1: User's own S3 config
  if (isUserS3Configured(user)) {
    console.log('📦 Using user-specific S3 configuration');
    return new S3Client({
      region: user.s3Config.region || 'us-east-1',
      credentials: {
        accessKeyId: user.s3Config.accessKeyId,
        secretAccessKey: user.s3Config.secretAccessKey
      }
    });
  }
  
  // Priority 2: Hardcoded S3 config
  if (HARDCODED_S3_CONFIG.enabled && HARDCODED_S3_CONFIG.bucket) {
    console.log('📦 Using hardcoded S3 configuration');
    
    const clientConfig = {
      region: HARDCODED_S3_CONFIG.region || 'us-east-1'
    };
    
    // Only add credentials if provided (otherwise use IAM roles)
    if (HARDCODED_S3_CONFIG.accessKeyId && HARDCODED_S3_CONFIG.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: HARDCODED_S3_CONFIG.accessKeyId,
        secretAccessKey: HARDCODED_S3_CONFIG.secretAccessKey
      };
    } else {
      console.log('📦 Using IAM roles for authentication (no credentials needed)');
    }
    
    return new S3Client(clientConfig);
  }
  
  // Priority 3: Environment variables
  if (process.env.AWS_S3_BUCKET && process.env.AWS_REGION) {
    console.log('📦 Using environment variable S3 configuration');
    
    const clientConfig = {
      region: process.env.AWS_REGION
    };
    
    // Only add credentials if provided (otherwise use IAM roles)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    } else {
      console.log('📦 Using IAM roles for authentication (no credentials needed)');
    }
    
    return new S3Client(clientConfig);
  }
  
  return null;
};

// Get S3 bucket name
const getS3Bucket = (user = null) => {
  if (isUserS3Configured(user)) {
    return user.s3Config.bucket;
  }
  if (HARDCODED_S3_CONFIG.enabled && HARDCODED_S3_CONFIG.bucket) {
    return HARDCODED_S3_CONFIG.bucket;
  }
  return process.env.AWS_S3_BUCKET;
};

// Get S3 region
const getS3Region = (user = null) => {
  if (isUserS3Configured(user)) {
    return user.s3Config.region || 'us-east-1';
  }
  if (HARDCODED_S3_CONFIG.enabled) {
    return HARDCODED_S3_CONFIG.region || 'us-east-1';
  }
  return process.env.AWS_REGION || 'us-east-1';
};

// Initialize system S3 client
if (isSystemS3Configured()) {
  console.log('✅ AWS S3 configured - All media will be stored in S3');
  console.log(`📦 S3 Bucket: ${getS3Bucket()}`);
  console.log(`🌍 Region: ${getS3Region()}`);
  
  if (HARDCODED_S3_CONFIG.enabled) {
    console.log('🔧 Using hardcoded S3 configuration');
    if (!HARDCODED_S3_CONFIG.accessKeyId || !HARDCODED_S3_CONFIG.secretAccessKey) {
      console.log('🔐 IAM roles will be used for authentication');
    }
  }
} else {
  console.log('⚠️  AWS S3 not configured - Media will be stored locally');
  console.log('💡 To enable S3 storage:');
  console.log('   1. Set HARDCODED_S3_CONFIG in server/utils/s3Storage.js, OR');
  console.log('   2. Add AWS_S3_BUCKET and AWS_REGION to .env file');
}

/**
 * Upload file to S3 with folder structure
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} originalName - Original filename
 * @param {String} mimeType - MIME type
 * @param {Object} user - User object (for user-specific S3)
 * @param {String} familyName - Family name for folder structure
 * @param {String} eventName - Event name for subfolder (optional)
 * @returns {Promise<Object>} - Upload result with URL
 */
const uploadToS3 = async (fileBuffer, originalName, mimeType, user = null, familyName = null, eventName = null) => {
  const s3Client = getS3Client(user);
  
  if (!s3Client) {
    throw new Error('S3 not configured');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop();
  const filename = `${timestamp}-${randomString}.${extension}`;
  
  // Build folder structure: uploads/[familyName]/[eventName]/filename
  let key = 'uploads/';
  if (familyName) {
    // Sanitize family name for S3 key
    const sanitizedFamily = familyName.replace(/[^a-zA-Z0-9-_]/g, '_');
    key += `${sanitizedFamily}/`;
    
    if (eventName) {
      // Sanitize event name for S3 key
      const sanitizedEvent = eventName.replace(/[^a-zA-Z0-9-_]/g, '_');
      key += `${sanitizedEvent}/`;
    }
  }
  key += filename;

  const bucket = getS3Bucket(user);
  const region = getS3Region(user);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType
    // Note: ACL removed - bucket must have public access via bucket policy instead
  });

  try {
    await s3Client.send(command);
    
    // Construct public URL
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    
    console.log('✅ File uploaded to S3:', url);
    
    return {
      success: true,
      url: url,
      thumbnail: url,
      key: key,
      filename: filename,
      source: 's3',
      bucket: bucket
    };
  } catch (error) {
    console.error('❌ Error uploading to S3:', error);
    throw error;
  }
};

/**
 * Delete file from S3
 * @param {String} key - S3 object key
 * @param {Object} user - User object (for user-specific S3)
 * @returns {Promise<Boolean>}
 */
const deleteFromS3 = async (key, user = null) => {
  const s3Client = getS3Client(user);
  
  if (!s3Client) {
    return false;
  }

  const bucket = getS3Bucket(user);

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });

  try {
    await s3Client.send(command);
    console.log('✅ File deleted from S3:', key);
    return true;
  } catch (error) {
    console.error('❌ Error deleting from S3:', error);
    return false;
  }
};

module.exports = {
  isSystemS3Configured,
  isUserS3Configured,
  uploadToS3,
  deleteFromS3,
  getS3Client,
  getS3Bucket,
  getS3Region
};
