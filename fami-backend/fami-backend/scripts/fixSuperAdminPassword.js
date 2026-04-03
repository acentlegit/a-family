/**
 * Fix super admin password - set it to the exact value from .env
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'chandra@acentle.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Admin$478';

const fixPassword = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Super Admin credentials from .env:');
    console.log('   Email:', SUPER_ADMIN_EMAIL);
    console.log('   Password:', SUPER_ADMIN_PASSWORD);
    console.log('   Password length:', SUPER_ADMIN_PASSWORD.length);

    let user = await User.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('\n📝 Creating Super Admin user...');
      const superAdminFirstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Admin';
      const superAdminLastName = process.env.SUPER_ADMIN_LAST_NAME || 'User';
      
      user = await User.create({
        email: SUPER_ADMIN_EMAIL.toLowerCase(),
        password: SUPER_ADMIN_PASSWORD,
        firstName: superAdminFirstName,
        lastName: superAdminLastName,
        role: 'SUPER_ADMIN'
      });
      console.log('✅ Super Admin user created!');
    } else {
      console.log('\n📋 Current user:');
      console.log('   Email:', user.email);
      console.log('   Name:', user.firstName, user.lastName);
      console.log('   Role:', user.role);
      
      // Update password and ensure role is SUPER_ADMIN
      user.password = SUPER_ADMIN_PASSWORD;
      user.role = 'SUPER_ADMIN';
      // Fix gender if invalid
      if (user.gender && typeof user.gender === 'string') {
        const validGenders = ['Male', 'Female', 'Other'];
        if (!validGenders.includes(user.gender)) {
          const genderLower = user.gender.toLowerCase();
          if (genderLower === 'male') user.gender = 'Male';
          else if (genderLower === 'female') user.gender = 'Female';
          else user.gender = undefined;
        }
      }
      await user.save({ validateBeforeSave: false });
      console.log('✅ Super Admin password and role updated!');
    }
    
    // Verify it works
    const user2 = await User.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() }).select('+password');
    const test = await user2.comparePassword(SUPER_ADMIN_PASSWORD);
    
    console.log('\n🔍 Verification test:');
    console.log('   Password test:', test ? '✅ PASS' : '❌ FAIL');
    
    console.log('\n💡 Super Admin login credentials:');
    console.log('   Email:', SUPER_ADMIN_EMAIL);
    console.log('   Password:', SUPER_ADMIN_PASSWORD);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixPassword();
