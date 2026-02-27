const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { CloudFrontClient } = require('@aws-sdk/client-cloudfront');
const { createCloudFrontDistribution, getCloudFrontDistribution, invalidateCloudFrontCache } = require('./cloudfrontConfig');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const cloudfrontClient = new CloudFrontClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Upload a file to S3
 */
async function uploadFileToS3(bucketName, key, filePath, contentType) {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: contentType || mime.lookup(filePath) || 'text/html',
      ACL: 'public-read', // For static website hosting
    });
    
    await s3Client.send(command);
    return `https://${bucketName}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

/**
 * Upload directory recursively to S3
 */
async function uploadDirectoryToS3(bucketName, localDir, s3Prefix = '') {
  const files = [];
  const items = fs.readdirSync(localDir, { withFileTypes: true });
  
  for (const item of items) {
    const localPath = path.join(localDir, item.name);
    const s3Key = path.join(s3Prefix, item.name).replace(/\\/g, '/');
    
    if (item.isDirectory()) {
      const subFiles = await uploadDirectoryToS3(bucketName, localPath, s3Key);
      files.push(...subFiles);
    } else {
      const contentType = mime.lookup(localPath) || 'text/html';
      const url = await uploadFileToS3(bucketName, s3Key, localPath, contentType);
      files.push({ key: s3Key, url, localPath });
    }
  }
  
  return files;
}

/**
 * Publish static site to S3
 */
async function publishToS3(familyId, config, pages) {
  const { buildStaticSite } = require('./websiteGenerator');
  
  // Build static site locally
  const localDir = await buildStaticSite(familyId, config, pages);
  
  // Determine S3 bucket name
  const bucketName = config.s3_bucket_name || process.env.AWS_S3_BUCKET || `family-portal-${familyId}`;
  const s3Prefix = `sites/${familyId}/`;
  
  try {
    // Upload all files to S3
    const uploadedFiles = await uploadDirectoryToS3(bucketName, localDir, s3Prefix);
    
    // Get or create CloudFront distribution
    let cloudfrontUrl = config.cloudfront_url;
    let distributionId = config.cloudfront_distribution_id;
    
    // If no CloudFront distribution exists, create one
    if (!distributionId && config.domain) {
      try {
        const distribution = await createCloudFrontDistribution(
          bucketName,
          config.domain,
          config.certificate_arn // Optional SSL certificate ARN
        );
        distributionId = distribution.distributionId;
        cloudfrontUrl = distribution.url;
        console.log(`✅ CloudFront distribution created: ${distributionId}`);
      } catch (error) {
        console.warn('⚠️  Could not create CloudFront distribution:', error.message);
        // Fall back to S3 URL
      }
    } else if (distributionId) {
      // Get existing distribution
      try {
        const distribution = await getCloudFrontDistribution(distributionId);
        cloudfrontUrl = distribution.url;
        
        // Invalidate cache to show latest content
        await invalidateCloudFrontCache(distributionId, ['/*']);
        console.log('✅ CloudFront cache invalidated');
      } catch (error) {
        console.warn('⚠️  Could not get CloudFront distribution:', error.message);
      }
    }
    
    const s3Url = `https://${bucketName}.s3.amazonaws.com/${s3Prefix}index.html`;
    
    return {
      success: true,
      bucketName,
      s3Key: `${s3Prefix}index.html`,
      s3Url,
      cloudfrontUrl: cloudfrontUrl || s3Url,
      distributionId,
      uploadedFiles: uploadedFiles.length,
    };
  } catch (error) {
    console.error('Error publishing to S3:', error);
    throw error;
  }
}

/**
 * Create or get CloudFront distribution
 */
async function setupCloudFront(bucketName, domain) {
  try {
    // This is a simplified version - full implementation would:
    // 1. Check if distribution exists
    // 2. Create new distribution if needed
    // 3. Configure origin (S3 bucket)
    // 4. Set up SSL certificate
    // 5. Return distribution URL
    
    // For now, return placeholder
    return {
      distributionId: null,
      url: `https://${bucketName}.s3.amazonaws.com`,
    };
  } catch (error) {
    console.error('Error setting up CloudFront:', error);
    throw error;
  }
}

module.exports = {
  publishToS3,
  uploadFileToS3,
  uploadDirectoryToS3,
  setupCloudFront,
};
