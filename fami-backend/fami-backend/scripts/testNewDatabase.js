const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  console.error('   Please make sure MONGODB_URI is set to your new database connection string');
  process.exit(1);
}

if (process.env.NEW_MONGODB_URI && MONGODB_URI === process.env.NEW_MONGODB_URI) {
  console.log('✅ MONGODB_URI is correctly set to new database');
} else {
  console.log('ℹ️  Using MONGODB_URI from .env file');
}

console.log('🔌 Testing connection to NEW database...');
console.log('   URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  })
  .then(async () => {
    console.log('✅ Successfully connected to NEW database!');
    
    // Test query - count users
    const db = mongoose.connection.db;
    const userCount = await db.collection('users').countDocuments();
    const familyCount = await db.collection('families').countDocuments();
    const memoryCount = await db.collection('memories').countDocuments();
    
    console.log('\n📊 Data verification:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Families: ${familyCount}`);
    console.log(`   Memories: ${memoryCount}`);
    
    if (userCount > 0 && familyCount > 0) {
      console.log('\n✅ Migration verified! Data is present in new database.');
    } else {
      console.log('\n⚠️  Warning: Some collections appear empty. Please verify migration.');
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Connection closed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
