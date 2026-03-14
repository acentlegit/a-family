# Step-by-Step Guide: Migrate from Old MongoDB to New MongoDB

This guide will help you **copy all data** from your old MongoDB database to a completely new MongoDB database.

---

## 📋 **STEP 1: Prepare Your Connection Strings**

You need two MongoDB connection strings:

1. **OLD MongoDB** (where your current data is)
   - Example: `mongodb://username:password@old-host:27017/database-name`
   - Or: `mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>`

2. **NEW MongoDB** (empty/new database where you want to copy data)
   - Example: `mongodb://username:password@new-host:27017/database-name`
   - Or: `mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>`

**Note:** Make sure your NEW database is **empty** or you're okay with existing data being skipped.

---

## 📝 **STEP 2: Create/Update .env File**

1. Navigate to the backend folder:
   ```bash
   cd fami-backend/fami-backend
   ```

2. Create or edit the `.env` file in this directory

3. Add these lines to your `.env` file:
   ```env
   # Your OLD MongoDB (source - where data currently is)
   OLD_MONGODB_URI=mongodb://username:password@old-host:27017/database-name
   
   # Your NEW MongoDB (destination - where you want to copy data)
   NEW_MONGODB_URI=mongodb://username:password@new-host:27017/database-name
   
   # Set to 'true' for testing (won't actually copy data)
   # Set to 'false' or remove this line to actually migrate
   DRY_RUN=false
   ```

**Important:** Replace the connection strings with your actual MongoDB URIs!

---

## 🔍 **STEP 3: Test Connection (Dry Run)**

Before copying data, test that both databases are accessible:

1. Open terminal/command prompt in the `fami-backend/fami-backend` folder

2. Run the dry run (this won't copy any data, just test connections):
   ```bash
   DRY_RUN=true node scripts/migrateMongoDB.js
   ```

3. You should see:
   - ✅ Connection to OLD MongoDB successful
   - ✅ Connection to NEW MongoDB successful
   - Count of documents in each collection
   - Summary showing what would be migrated

4. **If you see errors:**
   - Check your connection strings are correct
   - Verify network connectivity
   - Check credentials and permissions
   - Fix any issues before proceeding

---

## 🚀 **STEP 4: Perform the Migration**

Once the dry run works, perform the actual migration:

1. Make sure `DRY_RUN=false` in your `.env` file (or remove the line)

2. Run the migration script:
   ```bash
   node scripts/migrateMongoDB.js
   ```

3. The script will:
   - Connect to both databases
   - Copy all collections (users, families, members, memories, albums, events, etc.)
   - Show progress for each collection
   - Skip documents that already exist (by _id)
   - Display a summary at the end

4. **Wait for completion** - This may take time depending on your database size

5. You should see:
   ```
   ✅ Migration completed successfully!
   ```

---

## ✅ **STEP 5: Verify the Migration**

1. **Check the summary** - The script shows:
   - Total documents migrated
   - Total skipped (if any)
   - Total errors (should be 0)

2. **Manually verify** (optional):
   - Connect to your NEW database using MongoDB Compass or similar tool
   - Check that collections exist and have data
   - Compare document counts with old database

---

## 🔄 **STEP 6: Update Your Application**

After successful migration, switch your application to use the NEW database:

1. **Update your `.env` file:**
   ```env
   # Change this from old to new
   MONGODB_URI=mongodb://username:password@new-host:27017/database-name
   ```

2. **Or update environment variables** in your production environment:
   - Update `MONGODB_URI` to point to the new database
   - Restart your application/server

3. **Test your application:**
   - Start your server: `npm start` or `node server.js`
   - Try logging in with existing credentials
   - Check that all data is accessible
   - Test key features (families, members, memories, etc.)

---

## 🧪 **STEP 7: Final Testing**

1. **Test login** - Use existing user credentials
2. **Check families** - Verify family data is present
3. **Check members** - Verify member data is present
4. **Check memories/albums** - Verify media data is present
5. **Test all features** - Make sure everything works

---

## 🗑️ **STEP 8: Clean Up (After Verification)**

**⚠️ IMPORTANT: Only do this after you're 100% sure everything works!**

1. **Keep old database for a few days** as backup
2. **Monitor your application** for any issues
3. **After confirming everything works**, you can:
   - Decommission the old database
   - Remove `OLD_MONGODB_URI` from `.env` file

---

## 📊 **What Gets Migrated**

The following collections will be copied:
- ✅ users (user accounts)
- ✅ families (family groups)
- ✅ members (family members)
- ✅ memories (family memories)
- ✅ albums (photo albums)
- ✅ events (family events)
- ✅ blogposts (blog posts)
- ✅ messages (messages)
- ✅ notifications (notifications)
- ✅ invitations (family invitations)
- ✅ familytrees (family tree data)
- ✅ permissions (role-based permissions)
- ✅ auditlogs (audit logs)
- ✅ websiteconfigs (website configurations)
- ✅ websitepages (website pages)

---

## ❓ **Troubleshooting**

### Connection Errors
- Verify connection strings are correct
- Check network connectivity
- Ensure credentials have proper permissions
- Check firewall rules

### Duplicate Key Errors
- The script automatically skips existing documents
- You can re-run the script - it will skip duplicates
- Check the summary for skipped count

### Missing Data
- Re-run the migration script (it's safe to run multiple times)
- Check error messages in the console
- Verify both databases are accessible

### Large Databases
- Migration may take time for large databases
- Progress is shown every 500 documents
- Be patient and let it complete

---

## 🎯 **Quick Command Reference**

```bash
# Navigate to backend folder
cd fami-backend/fami-backend

# Test connection (dry run)
DRY_RUN=true node scripts/migrateMongoDB.js

# Perform actual migration
node scripts/migrateMongoDB.js

# Or explicitly set dry run to false
DRY_RUN=false node scripts/migrateMongoDB.js
```

---

## ✅ **Success Checklist**

- [ ] Both connection strings are correct
- [ ] Dry run completed successfully
- [ ] Migration completed without errors
- [ ] Verified data in new database
- [ ] Updated MONGODB_URI to new database
- [ ] Application tested and working
- [ ] All features verified
- [ ] Old database kept as backup

---

**Good luck with your migration! 🚀**
