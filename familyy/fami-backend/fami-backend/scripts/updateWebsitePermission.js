/**
 * Script to update USER role permissions to allow website generation
 * This makes canGenerateWebsite available to all users
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';

const updateWebsitePermission = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update USER role to have canGenerateWebsite: true
    const result = await Permission.updateMany(
      { role: 'USER' },
      { $set: { 'permissions.canGenerateWebsite': true } }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} USER permission(s)`);
    console.log('✅ All users can now generate websites!');
    console.log('\n💡 The server will automatically apply this on next restart.');
    console.log('   Or you can restart the server now for immediate effect.');

    // Also ensure ADMIN and SUPER_ADMIN have it
    await Permission.updateMany(
      { role: { $in: ['ADMIN', 'SUPER_ADMIN'] } },
      { $set: { 'permissions.canGenerateWebsite': true } }
    );

    console.log('✅ Verified ADMIN and SUPER_ADMIN permissions');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating permissions:', error);
    process.exit(1);
  }
};

updateWebsitePermission();
