/**
 * Script to restore website generation permission to ADMIN and SUPER_ADMIN only
 * USER role will NOT have this permission
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';

const restoreWebsitePermission = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Remove website generation permission from USER role
    const userResult = await Permission.updateMany(
      { role: 'USER' },
      { $set: { 'permissions.canGenerateWebsite': false } }
    );

    console.log(`\n✅ Updated ${userResult.modifiedCount} USER permission(s) - website generation removed`);

    // Ensure ADMIN and SUPER_ADMIN have website generation permission
    const adminResult = await Permission.updateMany(
      { role: { $in: ['ADMIN', 'SUPER_ADMIN'] } },
      { $set: { 'permissions.canGenerateWebsite': true } }
    );

    console.log(`✅ Updated ${adminResult.modifiedCount} ADMIN/SUPER_ADMIN permission(s) - website generation enabled`);
    console.log('\n✅ Website generation is now only available to ADMIN and SUPER_ADMIN roles');
    console.log('💡 The server will automatically apply this on next restart.');
    console.log('   Or you can restart the server now for immediate effect.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating permissions:', error);
    process.exit(1);
  }
};

restoreWebsitePermission();
