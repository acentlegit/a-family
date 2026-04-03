const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date },
  location: { type: String },
  media: [{
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true },
    thumbnail: { type: String },
    caption: { type: String }
  }],
  tags: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Memory', memorySchema);
