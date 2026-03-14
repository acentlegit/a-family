# MongoDB Migration Guide

This guide will help you migrate from your old MongoDB database to a new one.

## Prerequisites

- Node.js installed
- Access to both old and new MongoDB instances
- Connection strings for both databases

## Step 1: Prepare Environment Variables

Create or update your `.env` file in the `fami-backend/fami-backend` directory with the following variables:

```env
# Old MongoDB (source) - your current database
OLD_MONGODB_URI=mongodb://username:password@old-host:27017/database-name

# New MongoDB (destination) - your new database
NEW_MONGODB_URI=mongodb://username:password@new-host:27017/database-name

# Optional: Set to 'true' for dry run (no actual migration)
DRY_RUN=false
```

**Note:** If `OLD_MONGODB_URI` is not set, the script will use `MONGODB_URI` as the source.

## Step 2: Test Connection (Dry Run)

Before performing the actual migration, test it with a dry run:

```bash
cd fami-backend/fami-backend
DRY_RUN=true node scripts/migrateMongoDB.js
```

This will:
- Connect to both databases
- Count documents in each collection
- Show what would be migrated
- **NOT make any changes**

## Step 3: Perform Migration

Once you've verified the dry run looks correct, perform the actual migration:

```bash
cd fami-backend/fami-backend
DRY_RUN=false node scripts/migrateMongoDB.js
```

Or simply:

```bash
cd fami-backend/fami-backend
node scripts/migrateMongoDB.js
```

The script will:
- Connect to both databases
- Migrate all collections (User, Family, Member, Memory, Album, Event, BlogPost, Message, Notification, Invitation, FamilyTree, Permission, AuditLog, WebsiteConfig, WebsitePage)
- Skip documents that already exist (by _id)
- Show progress for each collection
- Provide a summary at the end

## Step 4: Update Application Configuration

After successful migration, update your application to use the new database:

1. **Update your `.env` file:**
   ```env
   MONGODB_URI=mongodb://username:password@new-host:27017/database-name
   ```

2. **Or update environment variables in your production environment:**
   - Update `MONGODB_URI` to point to the new database
   - Restart your application

## Step 5: Verify Migration

1. **Test your application:**
   - Log in with existing credentials
   - Check that families, members, memories, etc. are all present
   - Verify all features work correctly

2. **Compare document counts:**
   - You can run the dry run again to see if counts match
   - Or manually check a few collections

## Step 6: Clean Up (Optional)

Once you've verified everything works with the new database:

1. Keep the old database for a few days as backup
2. After confirming everything is working, you can decommission the old database

## Troubleshooting

### Connection Errors

If you get connection errors:
- Verify your connection strings are correct
- Check network connectivity to both databases
- Ensure credentials have proper permissions
- Check firewall rules

### Duplicate Key Errors

The script automatically skips documents that already exist (by _id). If you see duplicate key errors:
- The script will continue and report errors in the summary
- You can re-run the script - it will skip existing documents

### Missing Collections

If a collection doesn't exist in the old database, the script will skip it and continue with others.

### Large Databases

For very large databases:
- The script processes documents in batches of 100
- Progress is shown every 500 documents
- Migration may take some time depending on database size

## Collections Migrated

The following collections will be migrated:

1. **users** - User accounts and authentication
2. **families** - Family groups
3. **members** - Family members
4. **memories** - Family memories
5. **albums** - Photo albums
6. **events** - Family events
7. **blogposts** - Blog posts
8. **messages** - Messages
9. **notifications** - User notifications
10. **invitations** - Family invitations
11. **familytrees** - Family tree data
12. **permissions** - Role-based permissions
13. **auditlogs** - Audit logs
14. **websiteconfigs** - Website configurations
15. **websitepages** - Website pages

## Support

If you encounter issues:
1. Check the error messages in the console
2. Verify your connection strings
3. Ensure both databases are accessible
4. Try running with `DRY_RUN=true` first to diagnose issues
