const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String },
  photo: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dateOfBirth: { type: Date },
  relationship: { 
    type: String, 
    enum: ['Father', 'Mother', 'Son', 'Daughter', 'Grandfather', 'Grandmother', 'Grandson', 'Granddaughter', 'Brother', 'Sister', 'Uncle', 'Aunt', 'Nephew', 'Niece', 'Cousin', 'Spouse', 'Other'],
    default: 'Other'
  },
  role: { type: String, enum: ['Admin', 'Member', 'Guest'], default: 'Member' },
  
  // Parent relationships for tree structure
  father: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  mother: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  spouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  
  // Generation level (0 = root/oldest, 1 = children, 2 = grandchildren, etc.)
  generation: { type: Number, default: 0 },
  
  isAlive: { type: Boolean, default: true },
  notes: { type: String },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for faster queries
memberSchema.index({ family: 1, generation: 1 });

module.exports = mongoose.model('Member', memberSchema);
