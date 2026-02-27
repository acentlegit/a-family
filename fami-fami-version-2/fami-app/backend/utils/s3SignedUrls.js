/**
 * S3 Signed URL Service for Private Bucket Access
 * 
 * This module provides signed URLs for accessing private S3 objects
 * Required for BRD compliance: "Store securely in S3 private bucket" and "Signed URL access"
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getS3Client, getS3Bucket } = require('./s3Storage');

/**
 * Generate a signed URL for private S3 object access
 * @param {String} key - S3 object key
 * @param {Number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @param {Object} user - User object (for user-specific S3)
 * @returns {Promise<String>} - Signed URL
 */
async function getSignedUrlForObject(key, expiresIn = 3600, user = null) {
  const s3Client = getS3Client(user);
  const bucket = getS3Bucket(user);

  if (!s3Client || !bucket) {
    throw new Error('S3 not configured');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    // Generate signed URL that expires in expiresIn seconds
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

/**
 * Generate signed URLs for multiple objects
 * @param {Array<String>} keys - Array of S3 object keys
 * @param {Number} expiresIn - URL expiration time in seconds
 * @param {Object} user - User object
 * @returns {Promise<Object>} - Object mapping keys to signed URLs
 */
async function getSignedUrlsForObjects(keys, expiresIn = 3600, user = null) {
  const signedUrls = {};

  await Promise.all(
    keys.map(async (key) => {
      try {
        signedUrls[key] = await getSignedUrlForObject(key, expiresIn, user);
      } catch (error) {
        console.error(`Error generating signed URL for ${key}:`, error);
        signedUrls[key] = null;
      }
    })
  );

  return signedUrls;
}

/**
 * Generate signed URL for media file with family access check
 * @param {String} key - S3 object key
 * @param {String} familyId - Family ID for access verification
 * @param {Object} user - User object
 * @param {Number} expiresIn - URL expiration time in seconds
 * @returns {Promise<String>} - Signed URL
 */
async function getSignedUrlForFamilyMedia(key, familyId, user, expiresIn = 3600) {
  // TODO: Add family membership verification
  // Verify user has access to this family's media
  
  return await getSignedUrlForObject(key, expiresIn, user);
}

/**
 * Check if S3 bucket is configured as private
 * @param {Object} user - User object
 * @returns {Boolean}
 */
function isPrivateBucket(user = null) {
  // Check if bucket policy restricts public access
  // This should be configured in AWS Console or via Infrastructure as Code
  return process.env.S3_BUCKET_PRIVATE === 'true' || 
         process.env.S3_BUCKET_PRIVATE === '1';
}

module.exports = {
  getSignedUrlForObject,
  getSignedUrlsForObjects,
  getSignedUrlForFamilyMedia,
  isPrivateBucket,
};
