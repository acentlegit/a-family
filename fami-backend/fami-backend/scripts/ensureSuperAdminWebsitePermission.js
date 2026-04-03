/**
 * Ensure SUPER_ADMIN has canGenerateWebsite permission
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';

const ensurePermission = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update SUPER_ADMIN permissions to ensure canGenerateWebsite is true
    const result = await Permission.updateMany(
      { role: 'SUPER_ADMIN' },
      { $set: { 'permissions.canGenerateWebsite': true } }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} SUPER_ADMIN permission(s)`);
    
    // Also ensure ADMIN has it
    const adminResult = await Permission.updateMany(
      { role: 'ADMIN' },
      { $set: { 'permissions.canGenerateWebsite': true } }
    );
    
    console.log(`✅ Updated ${adminResult.modifiedCount} ADMIN permission(s)`);
    
    // Verify the permissions
    const superAdminPerm = await Permission.findOne({ role: 'SUPER_ADMIN' });
    if (superAdminPerm) {
      console.log('\n📋 SUPER_ADMIN permissions:');
      console.log('   canGenerateWebsite:', superAdminPerm.permissions.canGenerateWebsite ? '✅ ENABLED' : '❌ DISABLED');
    } else {
      console.log('\n⚠️  SUPER_ADMIN permission document not found - it will be created on next server restart');
    }
    
    console.log('\n✅ SUPER_ADMIN can now generate websites!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

ensurePermission();
