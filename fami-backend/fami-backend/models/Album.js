const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  name: { type: String, required: true },
  description: { type: String },
  coverPhoto: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  photos: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    description: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
    comments: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }]
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Album', albumSchema);
