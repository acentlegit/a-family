/**
 * Test script to verify super admin login credentials
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const SUPER_ADMIN_EMAIL = 'chandra@acentle.com';
const SUPER_ADMIN_PASSWORD = 'Admin$478';

const testLogin = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('User found:');
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  isSuperAdmin:', user.isSuperAdmin);
    console.log('  Password hash exists:', !!user.password);
    console.log('  Password hash length:', user.password ? user.password.length : 0);
    console.log('');

    // Test password comparison
    console.log('Testing password comparison...');
    const isMatch = await user.comparePassword(SUPER_ADMIN_PASSWORD);
    
    if (isMatch) {
      console.log('✅ Password is CORRECT! Login should work.');
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('');
      console.log('Fixing password...');
      
      // Set password directly and save (will trigger pre-save hook to hash)
      user.password = SUPER_ADMIN_PASSWORD;
      user.markModified('password');
      await user.save();
      
      console.log('✅ Password updated. Testing again...');
      const newUser = await User.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() }).select('+password');
      const newMatch = await newUser.comparePassword(SUPER_ADMIN_PASSWORD);
      
      if (newMatch) {
        console.log('✅ Password is now CORRECT!');
      } else {
        console.log('❌ Password still incorrect after update.');
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

testLogin();
