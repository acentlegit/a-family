const mongoose = require('mongoose');
const crypto = require('crypto');

const familySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  coverImage: { type: String },
  passcode: { 
    type: String,
    default: function() {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['Admin', 'Member', 'Guest'], default: 'Member' },
    relationship: { type: String },
    joinedAt: { type: Date, default: Date.now }
  }],
  settings: {
    isPrivate: { type: Boolean, default: false },
    allowMemberInvites: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate a random 6-digit passcode before saving if not provided
familySchema.pre('save', function(next) {
  if (!this.passcode) {
    this.passcode = Math.floor(100000 + Math.random() * 900000).toString();
  }
  next();
});

module.exports = mongoose.model('Family', familySchema);
