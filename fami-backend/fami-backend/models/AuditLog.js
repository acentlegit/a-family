const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_FAMILY',
      'UPDATE_FAMILY',
      'DELETE_FAMILY',
      'CREATE_MEMBER',
      'UPDATE_MEMBER',
      'DELETE_MEMBER',
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'INVITE_ADMIN',
      'TOGGLE_ADMIN',
      'BULK_DELETE',
      'EXPORT_DATA',
      'LOGIN',
      'LOGOUT',
      'OTHER'
    ]
  },
  method: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    enum: ['User', 'Family', 'Member', 'System', 'Other']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  targetName: String,
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'ERROR'],
    default: 'SUCCESS'
  },
  errorMessage: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000 // Auto-delete after 90 days
  }
});

// Index for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
