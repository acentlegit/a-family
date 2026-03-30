const mongoose = require('mongoose');

const migrationLocationSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  name: { type: String, required: true }, // e.g., "Hyderabad, India"
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  description: { type: String },
  year: { type: String }, // e.g., "1985" or "1955-1985"
  isOrigin: { type: Boolean, default: false }, // Mark as family origin
  order: { type: Number, default: 0 }, // Order for migration path
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MigrationLocation', migrationLocationSchema);
