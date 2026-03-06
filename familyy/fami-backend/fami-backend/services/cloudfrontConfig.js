const { CloudFrontClient, CreateDistributionCommand, GetDistributionCommand, UpdateDistributionCommand } = require('@aws-sdk/client-cloudfront');
const { S3Client, PutBucketWebsiteCommand, GetBucketWebsiteCommand } = require('@aws-sdk/client-s3');

const cloudfrontClient = new CloudFrontClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Create CloudFront distribution for S3 bucket
 */
async function createCloudFrontDistribution(bucketName, domain, certificateArn = null) {
  try {
    // First, enable S3 bucket website hosting
    await enableS3WebsiteHosting(bucketName);

    const distributionConfig = {
      CallerReference: `family-portal-${Date.now()}`,
      Comment: `CloudFront distribution for ${domain}`,
      DefaultRootObject: 'index.html',
      Origins: {
        Quantity: 1,
        Items: [
          {
            Id: `S3-${bucketName}`,
            DomainName: `${bucketName}.s3-website-${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`,
            CustomOriginConfig: {
              HTTPPort: 80,
              HTTPSPort: 443,
              OriginProtocolPolicy: 'http-only', // S3 website endpoints use HTTP
              OriginSslProtocols: {
                Quantity: 1,
                Items: ['TLSv1.2'],
              },
            },
          },
        ],
      },
      DefaultCacheBehavior: {
        TargetOriginId: `S3-${bucketName}`,
        ViewerProtocolPolicy: 'redirect-to-https', // Redirect HTTP to HTTPS
        AllowedMethods: {
          Quantity: 7,
          Items: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
          CachedMethods: {
            Quantity: 2,
            Items: ['GET', 'HEAD'],
          },
        },
        Compress: true,
        ForwardedValues: {
          QueryString: false,
          Cookies: {
            Forward: 'none',
          },
        },
        MinTTL: 0,
        DefaultTTL: 86400, // 1 day
        MaxTTL: 31536000, // 1 year
      },
      Enabled: true,
      PriceClass: 'PriceClass_100', // Use only North America and Europe
    };

    // Add custom domain and certificate if provided
    if (domain && certificateArn) {
      distributionConfig.Aliases = {
        Quantity: 1,
        Items: [domain],
      };
      distributionConfig.ViewerCertificate = {
        ACMCertificateArn: certificateArn,
        SSLSupportMethod: 'sni-only',
        MinimumProtocolVersion: 'TLSv1.2_2021',
      };
    } else {
      // Use CloudFront default certificate
      distributionConfig.ViewerCertificate = {
        CloudFrontDefaultCertificate: true,
      };
    }

    const command = new CreateDistributionCommand({
      DistributionConfig: distributionConfig,
    });

    const response = await cloudfrontClient.send(command);
    
    return {
      distributionId: response.Distribution.Id,
      domainName: response.Distribution.DomainName,
      status: response.Distribution.Status,
      url: `https://${response.Distribution.DomainName}`,
    };
  } catch (error) {
    console.error('Error creating CloudFront distribution:', error);
    throw error;
  }
}

/**
 * Get CloudFront distribution details
 */
async function getCloudFrontDistribution(distributionId) {
  try {
    const command = new GetDistributionCommand({ Id: distributionId });
    const response = await cloudfrontClient.send(command);
    
    return {
      id: response.Distribution.Id,
      domainName: response.Distribution.DomainName,
      status: response.Distribution.Status,
      enabled: response.Distribution.Enabled,
      url: `https://${response.Distribution.DomainName}`,
    };
  } catch (error) {
    console.error('Error getting CloudFront distribution:', error);
    throw error;
  }
}

/**
 * Enable S3 bucket website hosting
 */
async function enableS3WebsiteHosting(bucketName) {
  try {
    const command = new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: 'index.html' },
        ErrorDocument: { Key: 'index.html' }, // SPA fallback
      },
    });

    await s3Client.send(command);
    console.log(`✅ S3 website hosting enabled for ${bucketName}`);
  } catch (error) {
    // If website hosting is already configured, that's fine
    if (error.name !== 'BucketWebsiteAlreadyOwnedByYou') {
      console.error('Error enabling S3 website hosting:', error);
      throw error;
    }
  }
}

/**
 * Update CloudFront distribution
 */
async function updateCloudFrontDistribution(distributionId, updates) {
  try {
    // First get current distribution config
    const getCommand = new GetDistributionCommand({ Id: distributionId });
    const getResponse = await cloudfrontClient.send(getCommand);
    
    const config = getResponse.Distribution.DistributionConfig;
    
    // Apply updates
    if (updates.enabled !== undefined) {
      config.Enabled = updates.enabled;
    }
    
    if (updates.defaultRootObject) {
      config.DefaultRootObject = updates.defaultRootObject;
    }

    const updateCommand = new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: getResponse.ETag, // Required for updates
    });

    const response = await cloudfrontClient.send(updateCommand);
    
    return {
      distributionId: response.Distribution.Id,
      status: response.Distribution.Status,
    };
  } catch (error) {
    console.error('Error updating CloudFront distribution:', error);
    throw error;
  }
}

/**
 * Invalidate CloudFront cache (useful after publishing updates)
 */
async function invalidateCloudFrontCache(distributionId, paths = ['/*']) {
  try {
    const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');
    
    const command = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `invalidation-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    });

    const response = await cloudfrontClient.send(command);
    
    return {
      invalidationId: response.Invalidation.Id,
      status: response.Invalidation.Status,
    };
  } catch (error) {
    console.error('Error invalidating CloudFront cache:', error);
    throw error;
  }
}

module.exports = {
  createCloudFrontDistribution,
  getCloudFrontDistribution,
  updateCloudFrontDistribution,
  invalidateCloudFrontCache,
  enableS3WebsiteHosting,
};
