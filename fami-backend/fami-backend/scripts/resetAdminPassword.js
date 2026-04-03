/**
 * Script to reset admin user password to match .env file
 * This ensures the admin user can log in with the password from ADMIN_USER_PASSWORD
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';
const ADMIN_EMAIL = process.env.ADMIN_USER_EMAIL || 'chandra@acentle.com';
const ADMIN_PASSWORD = process.env.ADMIN_USER_PASSWORD || 'Acentle$2026!#';

const resetAdminPassword = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    if (!ADMIN_PASSWORD) {
      console.log('❌ ADMIN_USER_PASSWORD not set in .env file');
      process.exit(1);
    }

    // Find admin user
    const user = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (!user) {
      console.log(`❌ Admin user not found: ${ADMIN_EMAIL}`);
      console.log('💡 Creating admin user...');
      
      const adminFirstName = process.env.ADMIN_USER_FIRST_NAME || 'Chandra';
      const adminLastName = process.env.ADMIN_USER_LAST_NAME || 'Acentle';
      
      const newUser = await User.create({
        email: ADMIN_EMAIL.toLowerCase(),
        password: ADMIN_PASSWORD,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: 'ADMIN'
      });
      
      console.log('✅ Admin user created successfully!');
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Role: ${newUser.role}`);
      process.exit(0);
    }

    console.log(`\n📋 Current admin user info:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.role}`);

    // Update password (will be automatically hashed by User model)
    user.password = ADMIN_PASSWORD;
    // Fix gender if it's invalid (convert 'male' to 'Male', etc.)
    if (user.gender && typeof user.gender === 'string') {
      const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
      if (!validGenders.includes(user.gender)) {
        // Convert lowercase to proper case
        const genderLower = user.gender.toLowerCase();
        if (genderLower === 'male') user.gender = 'Male';
        else if (genderLower === 'female') user.gender = 'Female';
        else if (genderLower === 'other') user.gender = 'Other';
        else user.gender = 'Prefer not to say';
      }
    }
    await user.save({ validateBeforeSave: false });

    console.log(`\n✅ Admin password reset successfully!`);
    console.log(`   Password has been updated to match ADMIN_USER_PASSWORD from .env`);
    console.log(`\n💡 You can now log in with:`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    process.exit(1);
  }
};

resetAdminPassword();
