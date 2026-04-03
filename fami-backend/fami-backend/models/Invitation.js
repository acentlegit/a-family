const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  email: { type: String, required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['Admin', 'Member', 'Guest'], default: 'Member' },
  relationship: { type: String },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Declined', 'Expired'], default: 'Pending' },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invitation', invitationSchema);
