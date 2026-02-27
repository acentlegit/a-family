const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    required: true,
    unique: true
  },
  permissions: {
    // User management
    canManageUsers: { type: Boolean, default: false },
    canViewUsers: { type: Boolean, default: false },
    canDeleteUsers: { type: Boolean, default: false },
    
    // Family management
    canManageFamilies: { type: Boolean, default: false },
    canViewAllFamilies: { type: Boolean, default: false },
    canDeleteFamilies: { type: Boolean, default: false },
    
    // Content management
    canManageContent: { type: Boolean, default: false },
    canModerateContent: { type: Boolean, default: false },
    
    // System management
    canManageSystem: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false },
    
    // Admin specific
    canInviteAdmins: { type: Boolean, default: false },
    canManageAdmins: { type: Boolean, default: false },
    
    // App features (for USER role)
    canCreateFamily: { type: Boolean, default: true },
    canJoinFamily: { type: Boolean, default: true },
    canCreateMemories: { type: Boolean, default: true },
    canCreateEvents: { type: Boolean, default: true },
    canUploadMedia: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

permissionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Permission', permissionSchema);
