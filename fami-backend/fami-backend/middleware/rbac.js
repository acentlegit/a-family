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
            canDeleteFamilies: false,
            canGenerateWebsite: false  // Only admins can generate websites
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
            canUploadMedia: true,
            canGenerateWebsite: true  // Admins can generate websites
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
            canUploadMedia: true,
            canGenerateWebsite: true  // Super admins can generate websites
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
      // Update existing permissions to include canGenerateWebsite if missing
      try {
        // USER role should NOT have canGenerateWebsite permission
        await Permission.updateMany(
          { role: 'USER' },
          { $set: { 'permissions.canGenerateWebsite': false } }
        );
        // ADMIN and SUPER_ADMIN should have canGenerateWebsite permission
        await Permission.updateMany(
          { role: { $in: ['ADMIN', 'SUPER_ADMIN'] } },
          { $set: { 'permissions.canGenerateWebsite': true } }
        );
        console.log('✅ Updated existing permissions - only ADMIN and SUPER_ADMIN can generate websites');
      } catch (updateError) {
        console.log('ℹ️  Permissions update skipped (may already be updated)');
      }
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
        console.log('❌ Permission check - No user in request');
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        console.log('❌ Permission check - User not found:', req.user._id);
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      console.log('🔍 Permission check - User role:', user.role);
      console.log('🔍 Permission check - Required permission:', permission);
      
      const userPermission = await Permission.findOne({ role: user.role });
      if (!userPermission) {
        console.log('❌ Permission check - No permission config found for role:', user.role);
        return res.status(403).json({ 
          success: false, 
          message: 'Permission configuration not found for your role' 
        });
      }

      console.log('🔍 Permission check - User permissions:', JSON.stringify(userPermission.permissions, null, 2));
      console.log('🔍 Permission check - Has permission?', userPermission.permissions[permission]);

      if (!userPermission.permissions[permission]) {
        console.log(`❌ Permission check - User (${user.role}) does not have permission: ${permission}`);
        return res.status(403).json({ 
          success: false, 
          message: `You don't have permission to ${permission}. Your role: ${user.role}` 
        });
      }

      console.log('✅ Permission check - Permission granted');
      next();
    } catch (error) {
      console.error('❌ Permission check - Error:', error);
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

module.exports = { 
  initializePermissions,
  hasPermission: exports.hasPermission,
  hasAnyPermission: exports.hasAnyPermission
};
