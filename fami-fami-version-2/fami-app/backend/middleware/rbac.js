const Permission = require('../models/Permission');
const User = require('../models/User');

// Initialize default permissions if they don't exist
const initializePermissions = async () => {
  try {
    const permissions = await Permission.find();
    if (permissions.length === 0) {
      try {
        await Permission.insertMany([
          {
            role: 'USER',
          permissions: {
            canCreateFamily: true,
            canJoinFamily: true,
            canCreateMemories: true,
            canCreateEvents: true,
            canUploadMedia: true,
            canViewUsers: false,
            canManageUsers: false,
            canManageFamilies: false,
            canViewAllFamilies: false,
            canManageContent: false,
            canModerateContent: false,
            canManageSystem: false,
            canViewAnalytics: false,
            canManageSettings: false,
            canInviteAdmins: false,
            canManageAdmins: false,
            canDeleteUsers: false,
            canDeleteFamilies: false
          }
        },
        {
          role: 'ADMIN',
          permissions: {
            canViewUsers: true,
            canManageUsers: true,
            canViewAllFamilies: true,
            canManageFamilies: true,
            canManageContent: true,
            canModerateContent: true,
            canViewAnalytics: true,
            canManageSettings: false,
            canInviteAdmins: false,
            canManageAdmins: false,
            canDeleteUsers: false,
            canDeleteFamilies: false,
            canCreateFamily: true,
            canJoinFamily: true,
            canCreateMemories: true,
            canCreateEvents: true,
            canUploadMedia: true
          }
        },
        {
          role: 'SUPER_ADMIN',
          permissions: {
            canViewUsers: true,
            canManageUsers: true,
            canDeleteUsers: true,
            canViewAllFamilies: true,
            canManageFamilies: true,
            canDeleteFamilies: true,
            canManageContent: true,
            canModerateContent: true,
            canManageSystem: true,
            canViewAnalytics: true,
            canManageSettings: true,
            canInviteAdmins: true,
            canManageAdmins: true,
            canCreateFamily: true,
            canJoinFamily: true,
            canCreateMemories: true,
            canCreateEvents: true,
            canUploadMedia: true
          }
          }
        ], { ordered: false }); // ordered: false allows partial inserts
        console.log('✅ Default RBAC permissions initialized');
      } catch (insertError) {
        // If permissions already exist (duplicate key error), that's fine
        if (insertError.code === 11000 || insertError.code === 'E11000' || insertError.message?.includes('duplicate key')) {
          console.log('ℹ️  Permissions already exist in database');
        } else {
          console.error('Error inserting permissions:', insertError.message);
        }
      }
    } else {
      console.log(`ℹ️  Permissions already initialized (${permissions.length} roles found)`);
    }
  } catch (error) {
    // Only log if it's not a duplicate key error
    if (error.code !== 11000 && error.code !== 'E11000' && !error.message?.includes('duplicate key')) {
      console.error('Error checking permissions:', error.message);
    }
  }
};

// Check if user has specific permission
exports.hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const userPermission = await Permission.findOne({ role: user.role });
      if (!userPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission configuration not found for your role' 
        });
      }

      if (!userPermission.permissions[permission]) {
        return res.status(403).json({ 
          success: false, 
          message: `You don't have permission to ${permission}` 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error checking permissions' 
      });
    }
  };
};

// Check if user has any of the specified permissions
exports.hasAnyPermission = (...permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const userPermission = await Permission.findOne({ role: user.role });
      if (!userPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission configuration not found for your role' 
        });
      }

      const hasPermission = permissions.some(
        permission => userPermission.permissions[permission]
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions' 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error checking permissions' 
      });
    }
  };
};

// Initialize permissions on module load
initializePermissions();

module.exports = { initializePermissions };
