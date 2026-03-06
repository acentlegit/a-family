/**
 * Script to update a user's role
 * Usage: node scripts/updateUserRole.js <email> <role>
 * Example: node scripts/updateUserRole.js arakala1926 ADMIN
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';

const updateUserRole = async () => {
  try {
    // Get email and role from command line arguments
    const email = process.argv[2];
    const role = process.argv[3]?.toUpperCase();

    if (!email || !role) {
      console.log('❌ Usage: node scripts/updateUserRole.js <email> <role>');
      console.log('   Example: node scripts/updateUserRole.js arakala1926 ADMIN');
      console.log('   Valid roles: USER, ADMIN, SUPER_ADMIN');
      process.exit(1);
    }

    const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      console.log(`❌ Invalid role: ${role}`);
      console.log('   Valid roles:', validRoles.join(', '));
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\n📋 Current user info:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Current Role: ${user.role}`);

    // Update role
    user.role = role;
    await user.save();

    console.log(`\n✅ User role updated successfully!`);
    console.log(`   New Role: ${user.role}`);
    console.log(`\n💡 You may need to log out and log back in for the changes to take effect.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    process.exit(1);
  }
};

updateUserRole();
