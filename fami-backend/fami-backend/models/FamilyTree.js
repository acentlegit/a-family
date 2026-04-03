const mongoose = require('mongoose');

const familyTreeSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  nodes: [{
    id: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String },
    relationship: { type: String },
    role: { type: String },
    gender: { type: String },
    dateOfBirth: { type: Date },
    dateOfDeath: { type: Date },
    avatar: { type: String },
    parentId: { type: String },
    spouseId: { type: String },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    }
  }],
  treeImage: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FamilyTree', familyTreeSchema);
