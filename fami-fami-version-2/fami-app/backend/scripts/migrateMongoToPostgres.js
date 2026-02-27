/**
 * MongoDB to PostgreSQL Migration Script
 * 
 * This script migrates data from MongoDB to PostgreSQL
 * 
 * Usage:
 *   node scripts/migrateMongoToPostgres.js
 * 
 * Environment Variables:
 *   - MONGODB_URI: MongoDB connection string
 *   - PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD: PostgreSQL credentials
 */

const mongoose = require('mongoose');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fami';

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'family_portal',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

// MongoDB Models (import from existing models)
const User = require('../models/User');
const Family = require('../models/Family');
const Member = require('../models/Member');
const Event = require('../models/Event');
const Album = require('../models/Album');
const Memory = require('../models/Memory');

async function migrateUsers() {
  console.log('📦 Migrating users...');
  const users = await User.find({});
  let migrated = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Check if user already exists
      const existing = await pgPool.query('SELECT id FROM users WHERE email = $1', [user.email]);
      
      if (existing.rows.length > 0) {
        console.log(`⏭️  User ${user.email} already exists, skipping...`);
        continue;
      }

      // Insert user
      const result = await pgPool.query(
        `INSERT INTO users 
         (email, password_hash, first_name, last_name, role, is_super_admin, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          user.email,
          user.password, // Already hashed in MongoDB
          user.firstName,
          user.lastName,
          user.role || 'MEMBER',
          user.isSuperAdmin || false,
          user.isVerified || false,
          user.createdAt || new Date(),
          user.updatedAt || new Date(),
        ]
      );

      // Store mapping for foreign keys
      user._pgId = result.rows[0].id;
      migrated++;
    } catch (error) {
      console.error(`❌ Error migrating user ${user.email}:`, error.message);
      errors++;
    }
  }

  console.log(`✅ Users migrated: ${migrated}, Errors: ${errors}`);
  return { migrated, errors };
}

async function migrateFamilies() {
  console.log('📦 Migrating families...');
  const families = await Family.find({}).populate('createdBy');
  let migrated = 0;
  let errors = 0;

  for (const family of families) {
    try {
      // Get PostgreSQL user ID
      const userResult = await pgPool.query('SELECT id FROM users WHERE email = $1', [family.createdBy?.email]);
      const userId = userResult.rows[0]?.id;

      if (!userId) {
        console.log(`⚠️  Creator not found for family ${family.name}, skipping...`);
        errors++;
        continue;
      }

      // Insert family
      const result = await pgPool.query(
        `INSERT INTO families 
         (name, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          family.name,
          family.description,
          userId,
          family.createdAt || new Date(),
          family.updatedAt || new Date(),
        ]
      );

      family._pgId = result.rows[0].id;
      migrated++;
    } catch (error) {
      console.error(`❌ Error migrating family ${family.name}:`, error.message);
      errors++;
    }
  }

  console.log(`✅ Families migrated: ${migrated}, Errors: ${errors}`);
  return { migrated, errors };
}

async function migrateMembers() {
  console.log('📦 Migrating members...');
  const members = await Member.find({}).populate('family').populate('user');
  let migrated = 0;
  let errors = 0;

  for (const member of members) {
    try {
      // Get PostgreSQL family ID (Member model uses 'family' not 'familyId')
      const familyName = member.family?.name || (typeof member.family === 'object' ? member.family.name : null);
      if (!familyName) {
        // Try to get family by ID if not populated
        if (member.family && typeof member.family === 'object' && member.family._id) {
          const familyDoc = await Family.findById(member.family._id);
          if (familyDoc) {
            const familyResult = await pgPool.query('SELECT id FROM families WHERE name = $1', [familyDoc.name]);
            var familyId = familyResult.rows[0]?.id;
          }
        }
      } else {
        const familyResult = await pgPool.query('SELECT id FROM families WHERE name = $1', [familyName]);
        var familyId = familyResult.rows[0]?.id;
      }

      if (!familyId) {
        console.log(`⚠️  Family not found for member ${member.firstName}, skipping...`);
        errors++;
        continue;
      }

      // Get PostgreSQL user ID if exists (Member model uses 'user' not 'userId')
      let userId = null;
      if (member.user) {
        // Handle both ObjectId and populated user
        const userEmail = typeof member.user === 'object' && member.user.email 
          ? member.user.email 
          : null;
        if (userEmail) {
          const userResult = await pgPool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
          userId = userResult.rows[0]?.id;
        }
      }

      // Get parent and spouse IDs if they exist (Member model uses 'father', 'mother', 'spouse')
      let parentId = null;
      let spouseId = null;
      
      // Use father or mother as parent
      if (member.father) {
        const parentMember = await Member.findById(member.father);
        if (parentMember && parentMember._pgId) {
          parentId = parentMember._pgId;
        }
      } else if (member.mother) {
        const parentMember = await Member.findById(member.mother);
        if (parentMember && parentMember._pgId) {
          parentId = parentMember._pgId;
        }
      }

      if (member.spouse) {
        const spouseMember = await Member.findById(member.spouse);
        if (spouseMember && spouseMember._pgId) {
          spouseId = spouseMember._pgId;
        }
      }

      // Insert member
      const result = await pgPool.query(
        `INSERT INTO members 
         (family_id, user_id, first_name, last_name, email, phone, date_of_birth, 
          relationship, parent_id, spouse_id, profile_image_url, bio, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          familyId,
          userId,
          member.firstName,
          member.lastName,
          member.email,
          member.phone,
          member.dateOfBirth ? new Date(member.dateOfBirth) : null,
          member.relationship,
          parentId,
          spouseId,
          member.photo || member.profileImage,
          member.bio,
          member.createdAt || new Date(),
          member.updatedAt || new Date(),
        ]
      );

      member._pgId = result.rows[0].id;
      migrated++;
    } catch (error) {
      console.error(`❌ Error migrating member ${member.firstName}:`, error.message);
      errors++;
    }
  }

  console.log(`✅ Members migrated: ${migrated}, Errors: ${errors}`);
  return { migrated, errors };
}

async function migrateEvents() {
  console.log('📦 Migrating events...');
  const events = await Event.find({}).populate('family').populate('createdBy');
  let migrated = 0;
  let errors = 0;

  for (const event of events) {
    try {
      // Get PostgreSQL family ID (Event model uses 'family' not 'familyId')
      const familyName = event.family?.name || (typeof event.family === 'object' ? event.family.name : null);
      if (!familyName && event.family) {
        // Try to get family by ID if not populated
        if (typeof event.family === 'object' && event.family._id) {
          const familyDoc = await Family.findById(event.family._id);
          if (familyDoc) {
            const familyResult = await pgPool.query('SELECT id FROM families WHERE name = $1', [familyDoc.name]);
            var familyId = familyResult.rows[0]?.id;
          }
        }
      } else if (familyName) {
        const familyResult = await pgPool.query('SELECT id FROM families WHERE name = $1', [familyName]);
        var familyId = familyResult.rows[0]?.id;
      } else {
        var familyId = null;
      }

      if (!familyId) {
        console.log(`⚠️  Family not found for event ${event.title}, skipping...`);
        errors++;
        continue;
      }

      // Get PostgreSQL user ID
      let userId = null;
      if (event.createdBy) {
        const userResult = await pgPool.query('SELECT id FROM users WHERE email = $1', [event.createdBy.email]);
        userId = userResult.rows[0]?.id;
      }

      // Handle event date (Event model uses startDate, not date)
      const eventDate = event.startDate ? new Date(event.startDate) : (event.date ? new Date(event.date) : new Date());
      const eventTime = event.time || null;
      const eventType = event.eventType || event.type || 'GENERAL';

      // Insert event
      const result = await pgPool.query(
        `INSERT INTO events 
         (family_id, title, description, event_date, event_time, location, event_type, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          familyId,
          event.title,
          event.description,
          eventDate,
          eventTime,
          event.location,
          eventType,
          userId,
          event.createdAt || new Date(),
          event.updatedAt || new Date(),
        ]
      );

      event._pgId = result.rows[0].id;
      migrated++;
    } catch (error) {
      console.error(`❌ Error migrating event ${event.title}:`, error.message);
      errors++;
    }
  }

  console.log(`✅ Events migrated: ${migrated}, Errors: ${errors}`);
  return { migrated, errors };
}

async function migrateAlbums() {
  console.log('📦 Migrating albums...');
  const albums = await Album.find({}).populate('family').populate('createdBy');
  let migrated = 0;
  let errors = 0;

  for (const album of albums) {
    try {
      // Get PostgreSQL family ID (Album model uses 'family' not 'familyId')
      const familyName = album.family?.name || (typeof album.family === 'object' ? album.family.name : null);
      if (!familyName && album.family) {
        if (typeof album.family === 'object' && album.family._id) {
          const familyDoc = await Family.findById(album.family._id);
          if (familyDoc) {
            const familyResult = await pgPool.query('SELECT id FROM families WHERE name = $1', [familyDoc.name]);
            var familyId = familyResult.rows[0]?.id;
          }
        }
      } else if (familyName) {
        const familyResult = await pgPool.query('SELECT id FROM families WHERE name = $1', [familyName]);
        var familyId = familyResult.rows[0]?.id;
      } else {
        var familyId = null;
      }

      if (!familyId) {
        console.log(`⚠️  Family not found for album ${album.name}, skipping...`);
        errors++;
        continue;
      }

      // Get PostgreSQL user ID
      let userId = null;
      if (album.createdBy) {
        const userResult = await pgPool.query('SELECT id FROM users WHERE email = $1', [album.createdBy.email]);
        userId = userResult.rows[0]?.id;
      }

      // Insert album
      const result = await pgPool.query(
        `INSERT INTO albums 
         (family_id, name, description, cover_image_url, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          familyId,
          album.name,
          album.description,
          album.coverPhoto || album.coverImage || album.cover_image_url,
          userId,
          album.createdAt || new Date(),
          album.updatedAt || new Date(),
        ]
      );

      album._pgId = result.rows[0].id;
      migrated++;
    } catch (error) {
      console.error(`❌ Error migrating album ${album.name}:`, error.message);
      errors++;
    }
  }

  console.log(`✅ Albums migrated: ${migrated}, Errors: ${errors}`);
  return { migrated, errors };
}

async function main() {
  console.log('🚀 Starting MongoDB to PostgreSQL migration...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // Connect to PostgreSQL
    console.log('📡 Connecting to PostgreSQL...');
    await pgPool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected\n');

    // Run migrations
    const results = {
      users: await migrateUsers(),
      families: await migrateFamilies(),
      members: await migrateMembers(),
      events: await migrateEvents(),
      albums: await migrateAlbums(),
    };

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log('===================');
    Object.entries(results).forEach(([table, result]) => {
      console.log(`${table}: ${result.migrated} migrated, ${result.errors} errors`);
    });

    const totalMigrated = Object.values(results).reduce((sum, r) => sum + r.migrated, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    console.log(`\n✅ Total: ${totalMigrated} records migrated, ${totalErrors} errors`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    await mongoose.connection.close();
    await pgPool.end();
    console.log('\n🔌 Connections closed');
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  main();
}

module.exports = { main };
