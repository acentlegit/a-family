# Production Deployment Guide - AWS S3

## EC2 IP Address
**Backend Server:** `34.204.50.125:5000`

## Step 1: Create Production Environment File

Create `.env.production` file in the frontend root directory:

```env
# Production Environment Variables
REACT_APP_API_BASE=http://34.204.50.125:5000/api
REACT_APP_CLIENT_URL=http://YOUR-S3-BUCKET-URL
NODE_ENV=production
```

Replace `YOUR-S3-BUCKET-URL` with your actual S3 bucket URL after deployment.

## Step 2: Build Production Bundle

```bash
cd "C:\Users\saipoojitha\Downloads\frontend\frontend"
npm run build
```

This creates a `build` folder with optimized production files.

## Step 3: Remove node_modules (Optional - for clean deployment)

```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules

# Or using npm
npm prune --production
```

## Step 4: S3 Bucket Structure

After building, your S3 bucket should have this structure:

```
s3://your-bucket-name/
├── index.html
├── static/
│   ├── css/
│   │   ├── main.[hash].css
│   │   └── [other CSS files]
│   ├── js/
│   │   ├── main.[hash].js
│   │   ├── [chunk].[hash].js
│   │   └── [other JS files]
│   ├── media/
│   │   └── [images and assets]
│   └── [other static files]
├── asset-manifest.json
├── manifest.json
└── favicon.ico
```

## Step 5: S3 Bucket Configuration

1. **Enable Static Website Hosting:**
   - Go to S3 bucket → Properties → Static website hosting
   - Enable static website hosting
   - Index document: `index.html`
   - Error document: `index.html` (for React Router)

2. **Bucket Policy (for public access):**
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

3. **CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## Step 6: Upload to S3

### Using AWS CLI:
```bash
aws s3 sync build/ s3://your-bucket-name/ --delete
```

### Using AWS Console:
1. Go to S3 bucket
2. Upload all files from `build/` folder
3. Make sure to upload files, not the folder itself

## Step 7: Update Environment Variables

After getting your S3 bucket URL, update:
1. `.env.production` file with actual S3 URL
2. Backend `.env` file with `CLIENT_URL` pointing to S3 URL
3. Rebuild if needed

## Step 8: Backend Configuration

Update backend `.env` file:
```env
CLIENT_URL=http://YOUR-S3-BUCKET-URL
BASE_URL=http://34.204.50.125:5000
EC2_IP=34.204.50.125
MONGODB_URI=your-mongodb-connection-string
```

## Important Notes:

1. **No localhost references** - All replaced with EC2 IP or environment variables
2. **API calls** - Will use `http://34.204.50.125:5000/api`
3. **CORS** - Backend configured to accept requests from S3 bucket
4. **React Router** - S3 must serve `index.html` for all routes (404 → index.html)
