/**
 * Fix SUPER_ADMIN permissions - ensure canGenerateWebsite is enabled
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';

const fixPermissions = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find or create SUPER_ADMIN permission
    let superAdminPerm = await Permission.findOne({ role: 'SUPER_ADMIN' });
    
    if (!superAdminPerm) {
      console.log('\n📝 Creating SUPER_ADMIN permission document...');
      superAdminPerm = await Permission.create({
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
          canGenerateWebsite: true
        }
      });
      console.log('✅ SUPER_ADMIN permission document created!');
    } else {
      console.log('\n📋 Found existing SUPER_ADMIN permission document');
      console.log('   Current canGenerateWebsite:', superAdminPerm.permissions.canGenerateWebsite);
      
      // Update all permissions to ensure they're correct
      superAdminPerm.permissions = {
        ...superAdminPerm.permissions,
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
        canGenerateWebsite: true  // Ensure this is true
      };
      
      await superAdminPerm.save();
      console.log('✅ SUPER_ADMIN permissions updated!');
    }
    
    // Verify
    const verified = await Permission.findOne({ role: 'SUPER_ADMIN' });
    console.log('\n🔍 Verification:');
    console.log('   canGenerateWebsite:', verified.permissions.canGenerateWebsite ? '✅ ENABLED' : '❌ DISABLED');
    
    // Also ensure ADMIN has it
    let adminPerm = await Permission.findOne({ role: 'ADMIN' });
    if (adminPerm) {
      adminPerm.permissions.canGenerateWebsite = true;
      await adminPerm.save();
      console.log('✅ ADMIN canGenerateWebsite also enabled');
    }
    
    console.log('\n✅ SUPER_ADMIN can now generate websites!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixPermissions();
