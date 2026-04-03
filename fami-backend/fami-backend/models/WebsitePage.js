const mongoose = require('mongoose');

const pageContentBlockSchema = new mongoose.Schema({
  blockType: { type: String, required: true },
  blockOrder: { type: Number, default: 0 },
  contentData: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const websitePageSchema = new mongoose.Schema({
  familyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Family', 
    required: true 
  },
  pageType: { type: String, required: true },
  pageTitle: { type: String, required: true },
  pageSlug: { type: String, required: true },
  routePath: { type: String, required: true },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date },
  s3Key: { type: String },
  s3Url: { type: String },
  contentBlocks: [pageContentBlockSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure unique combination of familyId and pageSlug
websitePageSchema.index({ familyId: 1, pageSlug: 1 }, { unique: true });

// Update updatedAt before saving
websitePageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WebsitePage', websitePageSchema);
