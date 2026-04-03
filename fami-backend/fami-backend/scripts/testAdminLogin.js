/**
 * Test script to verify admin login credentials
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';
const ADMIN_EMAIL = process.env.ADMIN_USER_EMAIL || 'chandra@acentle.com';
const ADMIN_PASSWORD = process.env.ADMIN_USER_PASSWORD || 'Acentle$2026!#';

const testLogin = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Testing admin login...');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password from env:', ADMIN_PASSWORD);
    console.log('   Password length:', ADMIN_PASSWORD.length);

    // Find admin user
    const user = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() }).select('+password');
    if (!user) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }

    console.log('\n📋 User found:');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Password hash exists:', !!user.password);
    console.log('   Password hash starts with:', user.password ? user.password.substring(0, 20) + '...' : 'N/A');

    // Test password comparison
    console.log('\n🔍 Testing password comparison...');
    const isMatch = await user.comparePassword(ADMIN_PASSWORD);
    console.log('   Bcrypt comparison result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');

    if (!isMatch) {
      console.log('\n❌ Password does not match!');
      console.log('   This means the password in the database does not match the .env password.');
      console.log('   Let me try to reset it...');
      
      user.password = ADMIN_PASSWORD;
      await user.save({ validateBeforeSave: false });
      
      console.log('✅ Password reset. Testing again...');
      const user2 = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() }).select('+password');
      const isMatch2 = await user2.comparePassword(ADMIN_PASSWORD);
      console.log('   Bcrypt comparison result after reset:', isMatch2 ? '✅ MATCH' : '❌ NO MATCH');
      
      if (isMatch2) {
        console.log('\n✅ Password reset successful! You can now log in.');
      } else {
        console.log('\n❌ Password reset failed. There may be an issue with password hashing.');
      }
    } else {
      console.log('\n✅ Password is correct! Login should work.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testLogin();
