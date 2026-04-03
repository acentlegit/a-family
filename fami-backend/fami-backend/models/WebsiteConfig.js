const mongoose = require('mongoose');

const websiteConfigSchema = new mongoose.Schema({
  familyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Family', 
    required: true,
    unique: true 
  },
  siteTitle: { type: String },
  headerText: { type: String },
  footerText: { type: String },
  theme: { type: String, default: 'light' },
  layout: { type: String, default: 'sidebar' },
  logoUrl: { type: String },
  sampleImageUrl: { type: String },
  domain: { type: String },
  description: { type: String },
  customPages: { type: String },
  s3BucketName: { type: String },
  cloudfrontDistributionId: { type: String },
  cloudfrontUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt before saving
websiteConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WebsiteConfig', websiteConfigSchema);
