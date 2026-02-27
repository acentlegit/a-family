# Why CloudFront Still Works When S3 is Empty

## The Situation

You're seeing:
- ✅ **S3 Bucket (`arakala.net`)**: Empty (0 objects)
- ✅ **CloudFront (`www.arakala.net`)**: Still serving your application

## Why This Happens

### 1. **CloudFront Caching** (Most Likely Reason)

CloudFront is a **Content Delivery Network (CDN)** that caches your content:

```
User Request → CloudFront Edge Location → Checks Cache
                                          ↓
                                    ✅ Found in Cache?
                                          ↓
                                    Serve from Cache (FAST!)
                                          ↓
                                    ❌ Not in Cache?
                                          ↓
                                    Fetch from S3 Origin
```

**What this means:**
- CloudFront **stores copies** of your files at edge locations worldwide
- Even if S3 is empty, CloudFront still has the **old cached files**
- CloudFront serves from cache for **speed** (doesn't need to check S3 every time)

### 2. **CloudFront Origin Configuration**

Your CloudFront distribution might be:
- Pointing to a **different S3 bucket** (not the one you're looking at)
- Using a **different origin path** (e.g., `/build/` or `/dist/`)
- Configured with a **different bucket name** (e.g., `arakala.net-prod` or `www.arakala.net`)

### 3. **Multiple S3 Buckets**

You might have:
- One S3 bucket for **staging** (empty)
- Another S3 bucket for **production** (has files)
- CloudFront pointing to the **production bucket**

## How to Check

### Step 1: Check CloudFront Origin

1. Go to **CloudFront Console**
2. Click on your distribution (`www.arakala.net`)
3. Go to **"Origins"** tab
4. Check the **"Origin domain"** - this shows which S3 bucket CloudFront is using

**Example:**
```
Origin Domain: arakala.net.s3.amazonaws.com
Origin Path: (empty or /build)
```

### Step 2: Check CloudFront Cache Status

1. In CloudFront, go to **"Behaviors"** tab
2. Check **"Cache Policy"** and **"TTL (Time To Live)"**
3. This shows how long CloudFront keeps files cached

**Common TTL values:**
- `86400` seconds = 24 hours
- `31536000` seconds = 1 year
- `0` = No caching (always fetch from S3)

### Step 3: Verify the Correct S3 Bucket

1. Check if you have **multiple S3 buckets**:
   - `arakala.net`
   - `www.arakala.net`
   - `arakala.net-prod`
   - `arakala.net-production`
   - etc.

2. Upload a **test file** to the S3 bucket that CloudFront points to
3. See if it appears on your website

## What This Means for You

### ✅ Good News:
- Your CloudFront is working correctly
- Users can still access your site (from cache)
- This is normal CDN behavior

### ⚠️ Important:
- **Old files are still being served** (from cache)
- **New uploads won't appear immediately** until cache expires or is cleared
- You need to **clear CloudFront cache** after uploading new files

## What You Should Do

### Option 1: Upload New Build to S3 (Recommended)

1. **Upload your new build** to the S3 bucket that CloudFront points to
2. **Clear CloudFront cache** (create invalidation)
3. **Wait 5-10 minutes** for cache to clear
4. **Test your site** - should now show new content

### Option 2: Clear CloudFront Cache First

1. Go to CloudFront → Your Distribution
2. Go to **"Invalidations"** tab
3. Click **"Create invalidation"**
4. Enter: `/*` (clears all files)
5. Click **"Create invalidation"**
6. Wait 5-10 minutes
7. Your site will show **404 errors** (because S3 is empty)
8. Then upload your new build

## How to Create CloudFront Invalidation

1. **CloudFront Console** → Your Distribution
2. **"Invalidations"** tab
3. **"Create invalidation"** button
4. Enter paths:
   - `/*` (clears everything)
   - Or specific: `/index.html`, `/static/*`
5. Click **"Create invalidation"**
6. Wait for status to change from **"In Progress"** to **"Completed"**

## Summary

**Why CloudFront works when S3 is empty:**
- ✅ CloudFront caches files at edge locations
- ✅ Cache persists even if S3 origin is empty
- ✅ This is normal and expected behavior

**What to do:**
1. ✅ Check which S3 bucket CloudFront points to
2. ✅ Upload your new build to that bucket
3. ✅ Clear CloudFront cache (invalidation)
4. ✅ Test your site

Your application is still accessible because CloudFront is serving **cached copies** of your old files!
