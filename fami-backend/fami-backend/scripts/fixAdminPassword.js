/**
 * Fix admin password - set it to the exact value from .env
 * This handles any character encoding or special character issues
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';
const ADMIN_EMAIL = process.env.ADMIN_USER_EMAIL || 'chandra@acentle.com';

// Get password directly from env - handle both with and without #
const ADMIN_PASSWORD = process.env.ADMIN_USER_PASSWORD || 'Acentle$2026!#';

const fixPassword = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Admin password from .env:');
    console.log('   Raw value:', JSON.stringify(ADMIN_PASSWORD));
    console.log('   Length:', ADMIN_PASSWORD.length);
    console.log('   Characters:', ADMIN_PASSWORD.split('').map(c => c.charCodeAt(0)).join(', '));

    const user = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() }).select('+password');
    if (!user) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }

    console.log('\n📋 Current user:');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);

    // Set password to exact value from env
    user.password = ADMIN_PASSWORD;
    await user.save({ validateBeforeSave: false });

    console.log('\n✅ Password updated!');
    
    // Verify it works
    const user2 = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() }).select('+password');
    const test1 = await user2.comparePassword(ADMIN_PASSWORD);
    const test2 = await user2.comparePassword(ADMIN_PASSWORD.endsWith('#') ? ADMIN_PASSWORD.slice(0, -1) : ADMIN_PASSWORD + '#');
    
    console.log('\n🔍 Verification tests:');
    console.log('   Test with exact env password:', test1 ? '✅ PASS' : '❌ FAIL');
    console.log('   Test with # variation:', test2 ? '✅ PASS' : '❌ FAIL');
    
    console.log('\n💡 Login credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   (Try both with and without # if needed)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixPassword();
