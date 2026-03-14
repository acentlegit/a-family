const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Old MongoDB connection (source)
const OLD_MONGODB_URI = process.env.OLD_MONGODB_URI || process.env.MONGODB_URI;
// New MongoDB connection (destination)
const NEW_MONGODB_URI = process.env.NEW_MONGODB_URI;

if (!OLD_MONGODB_URI) {
  console.error('❌ OLD_MONGODB_URI or MONGODB_URI environment variable is required!');
  process.exit(1);
}

if (!NEW_MONGODB_URI) {
  console.error('❌ NEW_MONGODB_URI environment variable is required!');
  console.error('   Please set NEW_MONGODB_URI to your new MongoDB connection string.');
  process.exit(1);
}

// Dry run mode (default: false)
const DRY_RUN = process.env.DRY_RUN === 'true';

// Collection names to migrate (Mongoose pluralizes model names)
// 'User' -> 'users', 'Family' -> 'families', etc.
const collections = [
  'users',
  'families',
  'members',
  'memories',
  'albums',
  'events',
  'blogposts',
  'messages',
  'notifications',
  'invitations',
  'familytrees',
  'permissions',
  'auditlogs',
  'websiteconfigs',
  'websitepages'
];

let oldConnection;
let newConnection;

/**
 * Migrate a single collection
 */
async function migrateCollection(collectionName, oldDb, newDb) {
  const oldCollection = oldDb.collection(collectionName);
  const newCollection = newDb.collection(collectionName);

  console.log(`\n📦 Migrating ${collectionName}...`);

  // Get count
  const count = await oldCollection.countDocuments();
  console.log(`   Found ${count} documents`);

  if (count === 0) {
    console.log(`   ⏭️  Skipping (empty collection)`);
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  if (DRY_RUN) {
    console.log(`   🔍 DRY RUN: Would migrate ${count} documents`);
    return { migrated: count, skipped: 0, errors: 0 };
  }

  // Fetch all documents
  const documents = await oldCollection.find({}).toArray();
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  // Insert documents in batches
  const batchSize = 100;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    
    try {
      // Check if documents already exist (by _id)
      const ids = batch.map(doc => doc._id);
      const existing = await newCollection.find({ _id: { $in: ids } }).toArray();
      const existingIds = new Set(existing.map(doc => doc._id.toString()));
      
      const toInsert = batch.filter(doc => !existingIds.has(doc._id.toString()));
      
      if (toInsert.length > 0) {
        await newCollection.insertMany(toInsert, { ordered: false });
        migrated += toInsert.length;
      }
      
      skipped += batch.length - toInsert.length;
      
      if ((i + batchSize) % 500 === 0 || i + batchSize >= documents.length) {
        const progress = Math.min(i + batchSize, documents.length);
        console.log(`   Progress: ${progress}/${documents.length} documents processed`);
      }
    } catch (error) {
      console.error(`   ❌ Error migrating batch: ${error.message}`);
      errors += batch.length;
    }
  }

  console.log(`   ✅ Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
  return { migrated, skipped, errors };
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting MongoDB Migration');
  console.log('==============================');
  console.log(`Old MongoDB: ${OLD_MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`New MongoDB: ${NEW_MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✏️  LIVE MIGRATION'}`);
  console.log('==============================\n');

  try {
    // Connect to old MongoDB
    console.log('🔌 Connecting to OLD MongoDB...');
    oldConnection = await mongoose.createConnection(OLD_MONGODB_URI).asPromise();
    const oldDb = oldConnection.db;
    console.log('✅ Connected to OLD MongoDB\n');

    // Connect to new MongoDB
    console.log('🔌 Connecting to NEW MongoDB...');
    newConnection = await mongoose.createConnection(NEW_MONGODB_URI).asPromise();
    const newDb = newConnection.db;
    console.log('✅ Connected to NEW MongoDB\n');

    // Load all models (we need to require them to register with mongoose)
    console.log('📚 Loading models...');
    require('../models/User');
    require('../models/Family');
    require('../models/Member');
    require('../models/Memory');
    require('../models/Album');
    require('../models/Event');
    require('../models/BlogPost');
    require('../models/Message');
    require('../models/Notification');
    require('../models/Invitation');
    require('../models/FamilyTree');
    require('../models/Permission');
    require('../models/AuditLog');
    require('../models/WebsiteConfig');
    require('../models/WebsitePage');
    console.log('✅ Models loaded\n');

    // Migrate each collection
    const results = {};
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const collectionName of collections) {
      try {
        const result = await migrateCollection(collectionName, oldDb, newDb);
        results[collectionName] = result;
        totalMigrated += result.migrated;
        totalSkipped += result.skipped;
        totalErrors += result.errors;
      } catch (error) {
        console.error(`❌ Error migrating ${collectionName}: ${error.message}`);
        results[collectionName] = { migrated: 0, skipped: 0, errors: 1 };
        totalErrors++;
      }
    }

    // Summary
    console.log('\n==============================');
    console.log('📊 Migration Summary');
    console.log('==============================');
    console.log(`Total Migrated: ${totalMigrated}`);
    console.log(`Total Skipped: ${totalSkipped}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log('==============================\n');

    if (DRY_RUN) {
      console.log('🔍 This was a DRY RUN. No data was actually migrated.');
      console.log('   Set DRY_RUN=false or remove it to perform the actual migration.\n');
    } else {
      console.log('✅ Migration completed successfully!\n');
      console.log('📝 Next steps:');
      console.log('   1. Update your MONGODB_URI environment variable to point to the new database');
      console.log('   2. Test your application with the new database');
      console.log('   3. Once verified, you can decommission the old database\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (oldConnection) {
      await oldConnection.close();
      console.log('🔌 Closed OLD MongoDB connection');
    }
    if (newConnection) {
      await newConnection.close();
      console.log('🔌 Closed NEW MongoDB connection');
    }
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
