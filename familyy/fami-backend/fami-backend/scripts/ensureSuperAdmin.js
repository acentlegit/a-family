/**
 * Script to ensure Super Admin user always exists with correct credentials
 * This ensures chandra@acentle.com is ALWAYS the only super admin
 * 
 * This script:
 * 1. Creates/updates the super admin user with exact credentials
 * 2. Removes super admin status from any other users
 * 3. Ensures only chandra@acentle.com can be super admin
 * 
 * Usage: node scripts/ensureSuperAdmin.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const SUPER_ADMIN_EMAIL = 'chandra@acentle.com';
const SUPER_ADMIN_PASSWORD = 'Admin$478';
const SUPER_ADMIN_FIRST_NAME = 'Chandra';
const SUPER_ADMIN_LAST_NAME = 'Admin';

const ensureSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Step 1: Remove super admin status from all other users
    console.log('\n📝 Removing super admin status from other users...');
    const otherSuperAdmins = await User.updateMany(
      { 
        email: { $ne: SUPER_ADMIN_EMAIL.toLowerCase() },
        $or: [
          { role: 'SUPER_ADMIN' },
          { isSuperAdmin: true }
        ]
      },
      {
        $set: {
          role: 'USER',
          isSuperAdmin: false
        }
      }
    );
    
    if (otherSuperAdmins.modifiedCount > 0) {
      console.log(`✅ Removed super admin status from ${otherSuperAdmins.modifiedCount} other user(s)`);
    } else {
      console.log('✅ No other users had super admin status');
    }

    // Step 2: Find or create the super admin user
    let superAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() });

    if (!superAdmin) {
      // Create new super admin user
      console.log(`\n📝 Creating Super Admin user: ${SUPER_ADMIN_EMAIL}...`);
      superAdmin = await User.create({
        email: SUPER_ADMIN_EMAIL.toLowerCase(),
        password: SUPER_ADMIN_PASSWORD,
        firstName: SUPER_ADMIN_FIRST_NAME,
        lastName: SUPER_ADMIN_LAST_NAME,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        isVerified: true
      });
      console.log(`✅ Super Admin user created successfully!`);
    } else {
      // Update existing user to ensure correct credentials and status
      console.log(`\n📝 Updating Super Admin user: ${SUPER_ADMIN_EMAIL}...`);
      superAdmin.password = SUPER_ADMIN_PASSWORD;
      superAdmin.firstName = SUPER_ADMIN_FIRST_NAME;
      superAdmin.lastName = SUPER_ADMIN_LAST_NAME;
      superAdmin.role = 'SUPER_ADMIN';
      superAdmin.isSuperAdmin = true;
      superAdmin.isVerified = true;
      
      // Fix gender field if it's invalid (enum requires 'Male', 'Female', or 'Other')
      if (superAdmin.gender && !['Male', 'Female', 'Other'].includes(superAdmin.gender)) {
        console.log(`⚠️  Fixing invalid gender value: ${superAdmin.gender}`);
        // Convert lowercase to proper case, or remove if not recognized
        const genderMap = { 'male': 'Male', 'female': 'Female', 'other': 'Other' };
        superAdmin.gender = genderMap[superAdmin.gender.toLowerCase()] || undefined;
      }
      
      // Mark password as modified so it gets hashed
      superAdmin.markModified('password');
      await superAdmin.save();
      console.log(`✅ Super Admin user updated successfully!`);
    }

    // Step 3: Verify the super admin user
    const verifiedSuperAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() });
    
    console.log(`\n🎉 Super Admin Credentials Verified:`);
    console.log(`   Email: ${verifiedSuperAdmin.email}`);
    console.log(`   Name: ${verifiedSuperAdmin.firstName} ${verifiedSuperAdmin.lastName}`);
    console.log(`   Role: ${verifiedSuperAdmin.role}`);
    console.log(`   Super Admin: ${verifiedSuperAdmin.isSuperAdmin}`);
    console.log(`   Verified: ${verifiedSuperAdmin.isVerified}`);
    console.log(`\n✅ Login Credentials:`);
    console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   Password: ${SUPER_ADMIN_PASSWORD}`);
    console.log(`\n✅ You can now log in at http://localhost:3000`);
    console.log(`\n✅ Only ${SUPER_ADMIN_EMAIL} can be Super Admin`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
ensureSuperAdmin();
