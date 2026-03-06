const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  title: { type: String, required: true },
  description: { type: String },
  eventType: { type: String, enum: ['Birthday', 'Anniversary', 'Reunion', 'Holiday', 'Other'], default: 'Other' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  location: { type: String },
  isVirtual: { type: Boolean, default: false },
  meetingLink: { type: String },
  coverImage: { type: String },
  attendees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['going', 'maybe', 'not-going', 'pending'], default: 'pending' },
    respondedAt: { type: Date }
  }],
  photos: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
