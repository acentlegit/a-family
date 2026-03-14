const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

console.log('🔍 Checking MongoDB Connection...\n');

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    const host = mongoose.connection.host;
    
    console.log('📊 Current Database Connection:');
    console.log('   Database Name:', dbName);
    console.log('   Host:', host);
    console.log('   Connection String:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
    
    // Check if it's the new database
    if (host.includes('famidb2026')) {
      console.log('\n✅ CONNECTED TO NEW DATABASE (famidb2026)');
    } else if (host.includes('cluster0.rn8k391')) {
      console.log('\n⚠️  CONNECTED TO OLD DATABASE (cluster0.rn8k391)');
    }
    
    const userCount = await db.collection('users').countDocuments();
    const familyCount = await db.collection('families').countDocuments();
    const memoryCount = await db.collection('memories').countDocuments();
    
    console.log('\n📊 Data in Database:');
    console.log('   Users:', userCount);
    console.log('   Families:', familyCount);
    console.log('   Memories:', memoryCount);
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
  });
