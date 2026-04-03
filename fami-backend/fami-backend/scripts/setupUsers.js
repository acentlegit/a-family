const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Permission = require('../models/Permission');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';

async function setupUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ Connected to MongoDB');

    // Update permissions to include canGenerateWebsite
    console.log('\n📝 Updating permissions...');
    await Permission.updateMany(
      { role: 'USER' },
      { $set: { 'permissions.canGenerateWebsite': false } }
    );
    await Permission.updateMany(
      { role: { $in: ['ADMIN', 'SUPER_ADMIN'] } },
      { $set: { 'permissions.canGenerateWebsite': true } }
    );
    console.log('✅ Permissions updated');

    // Setup default user (arakala1926)
    console.log('\n👤 Setting up default user (arakala1926)...');
    const defaultUserEmail = 'arakala1926';
    const defaultUserPassword = 'a1926$2026';
    
    let defaultUser = await User.findOne({ email: defaultUserEmail });
    if (defaultUser) {
      // Update existing user
      defaultUser.password = defaultUserPassword;
      defaultUser.role = 'USER';
      defaultUser.firstName = defaultUser.firstName || 'Default';
      defaultUser.lastName = defaultUser.lastName || 'User';
      await defaultUser.save();
      console.log('✅ Default user updated');
    } else {
      // Create new user
      defaultUser = await User.create({
        email: defaultUserEmail,
        password: defaultUserPassword,
        firstName: 'Default',
        lastName: 'User',
        role: 'USER'
      });
      console.log('✅ Default user created');
    }

    // Setup admin user (chandra@acentle.com)
    console.log('\n👑 Setting up admin user (chandra@acentle.com)...');
    const adminEmail = 'chandra@acentle.com';
    const adminPassword = 'Acentle$2026!#';
    
    let adminUser = await User.findOne({ email: adminEmail });
    if (adminUser) {
      // Update existing admin
      adminUser.password = adminPassword;
      adminUser.role = 'ADMIN'; // or 'SUPER_ADMIN' if you want full access
      adminUser.firstName = adminUser.firstName || 'Chandra';
      adminUser.lastName = adminUser.lastName || 'Acentle';
      await adminUser.save();
      console.log('✅ Admin user updated');
    } else {
      // Create new admin
      adminUser = await User.create({
        email: adminEmail,
        password: adminPassword,
        firstName: 'Chandra',
        lastName: 'Acentle',
        role: 'ADMIN' // or 'SUPER_ADMIN' if you want full access
      });
      console.log('✅ Admin user created');
    }

    console.log('\n✅ User setup completed!');
    console.log('\n📋 User Summary:');
    console.log(`   Default User: ${defaultUserEmail} (Role: ${defaultUser.role})`);
    console.log(`   Admin User: ${adminEmail} (Role: ${adminUser.role})`);
    console.log('\n✅ All users are ready!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up users:', error);
    process.exit(1);
  }
}

setupUsers();
