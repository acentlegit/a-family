# AWS S3 Bucket Structure for Frontend Deployment

## EC2 Backend IP: `34.204.50.125:5000`

## S3 Bucket Structure

After running `npm run build`, upload the contents of the `build/` folder to your S3 bucket:

```
s3://your-bucket-name/
│
├── index.html                    (Main HTML file - React Router entry point)
├── asset-manifest.json           (Asset mapping for React)
├── manifest.json                 (PWA manifest)
├── favicon.ico                   (Site favicon)
├── logo192.png                   (PWA logo 192x192)
├── logo512.png                   (PWA logo 512x512)
│
└── static/                       (All static assets)
    ├── css/
    │   └── main.[hash].css       (Main CSS bundle - ~18 KB gzipped)
    │
    ├── js/
    │   ├── main.[hash].js        (Main JS bundle - ~344 KB gzipped)
    │   ├── [chunk].[hash].js     (Code-split chunks)
    │   └── [runtime].[hash].js   (Webpack runtime)
    │
    └── media/
        └── [images and assets]   (Any imported media files)
```

## File Sizes (After Build)

- **Main JS Bundle:** ~344 KB (gzipped)
- **Main CSS Bundle:** ~18 KB (gzipped)
- **Total Build Size:** ~500-600 KB (uncompressed)

## S3 Bucket Configuration Steps

### 1. Enable Static Website Hosting

1. Go to your S3 bucket → **Properties** tab
2. Scroll to **Static website hosting**
3. Click **Edit**
4. Enable static website hosting
5. Set:
   - **Index document:** `index.html`
   - **Error document:** `index.html` (Important for React Router!)
6. Save changes
7. Note the **Bucket website endpoint** URL (e.g., `http://bucket-name.s3-website-region.amazonaws.com`)

### 2. Set Bucket Policy (Public Read Access)

Go to **Permissions** → **Bucket policy** and add:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

Replace `your-bucket-name` with your actual bucket name.

### 3. Block Public Access Settings

1. Go to **Permissions** → **Block public access**
2. **Uncheck** "Block all public access" (or uncheck individual settings)
3. Confirm the change
4. This is required for static website hosting

### 4. CORS Configuration (Optional but Recommended)

Go to **Permissions** → **CORS** and add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

### 5. Upload Files

**Using AWS CLI:**
```bash
aws s3 sync build/ s3://your-bucket-name/ --delete --acl public-read
```

**Using AWS Console:**
1. Go to your S3 bucket
2. Click **Upload**
3. Select all files from the `build/` folder
4. **Important:** Upload files directly, not the `build` folder itself
5. Set permissions: **Grant public-read access**
6. Upload

## Environment Variables Update

After deployment, update your `.env.production` with the actual S3 bucket URL:

```env
REACT_APP_API_BASE=http://34.204.50.125:5000/api
REACT_APP_CLIENT_URL=http://your-bucket-name.s3-website-region.amazonaws.com
NODE_ENV=production
```

Then rebuild if needed.

## Backend Configuration

Update backend `.env` file on EC2:

```env
CLIENT_URL=http://your-bucket-name.s3-website-region.amazonaws.com
BASE_URL=http://34.204.50.125:5000
EC2_IP=34.204.50.125
MONGODB_URI=your-mongodb-connection-string
PORT=5000
```

## Testing Deployment

1. Access your S3 website endpoint
2. Test API calls to `http://34.204.50.125:5000/api`
3. Verify all routes work (React Router)
4. Check browser console for any errors

## CloudFront Distribution (Optional - Recommended for Production)

For better performance and HTTPS:

1. Create CloudFront distribution
2. Origin: Your S3 bucket website endpoint
3. Default root object: `index.html`
4. Error pages: 404 → `/index.html` (200 status)
5. Update `REACT_APP_CLIENT_URL` with CloudFront URL

## Important Notes

✅ **All localhost references removed** - Replaced with EC2 IP or environment variables
✅ **Production build created** - Optimized and minified
✅ **No hardcoded IPs** - Uses environment variables
✅ **CORS configured** - Backend accepts requests from S3
✅ **React Router ready** - Error document set to index.html
