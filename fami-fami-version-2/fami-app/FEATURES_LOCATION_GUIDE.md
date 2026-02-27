# Features Location Guide - Where to Find Everything

## 🎯 How to Access Website Admin Features

### Step 1: Navigate to Website Admin
1. **In the Sidebar**: Look for "Website Admin" menu item (with desktop icon)
   - It's visible to all authenticated users
   - Located below the main menu items
   
2. **Direct URL**: Navigate to `http://localhost:3000/website-admin`

### Step 2: Select a Family
- A dropdown will appear at the top
- Select a family from the list
- Once selected, all features become available

## 📍 Feature Locations

### 1. **Website Administration Page**
- **Route**: `/website-admin` or `/website-admin/:familyId`
- **File**: `frontend/src/pages/WebsiteAdmin.tsx`
- **Features**:
  - Website configuration (title, header, footer, theme)
  - Page creation and management
  - Content block editor
  - Preview functionality
  - S3 publishing

### 2. **Page Types Available**
When creating a page, you can choose:
- **Homepage** - Landing page
- **Contact** - Contact form page
- **Blog** - Blog posts page
- **Gallery** - Image gallery page
- **Events** - Events listing page
- **Family Tree** - Family tree visualization
- **Custom** - Custom page type

### 3. **Content Block Types**
When editing a page, you can add:
- **Hero** - Large header section
- **Text** - Text content blocks
- **Image** - Single image with caption
- **Gallery** - Image gallery grid
- **Form** - Contact or custom forms
- **Video** - Embedded videos
- **Map** - Google Maps integration
- **Timeline** - Event timeline
- **Testimonial** - Testimonial cards
- **Stats** - Statistics/metrics display

### 4. **Backend API Endpoints**
All located in: `backend/routes/websiteAdmin.js`

- `GET /api/website-admin/config/:familyId` - Get website config
- `POST /api/website-admin/config/:familyId` - Save website config
- `GET /api/website-admin/pages/:familyId` - Get all pages
- `POST /api/website-admin/pages/:familyId` - Create new page
- `PUT /api/website-admin/pages/:pageId` - Update page
- `DELETE /api/website-admin/pages/:pageId` - Delete page
- `POST /api/website-admin/preview/:familyId` - Generate preview
- `POST /api/website-admin/publish/:familyId` - Publish to S3

### 5. **Database Schema**
- **File**: `backend/database/schema.sql`
- **Tables**:
  - `website_configs` - Website settings
  - `website_pages` - Page definitions
  - `page_content_blocks` - Content blocks for each page

### 6. **S3 Publishing Service**
- **File**: `backend/services/s3Publisher.js`
- **Features**:
  - Uploads static HTML to S3
  - Creates CloudFront distribution
  - Returns published URLs

### 7. **Website Generator**
- **File**: `backend/services/websiteGenerator.js`
- **Features**:
  - Generates static HTML from page configs
  - Supports multiple themes
  - Renders all content block types

### 8. **CloudFront Configuration**
- **File**: `backend/services/cloudfrontConfig.js`
- **Features**:
  - Creates CloudFront distributions
  - HTTPS enforcement
  - Cache invalidation

### 9. **S3 Signed URLs (Private Bucket)**
- **File**: `backend/utils/s3SignedUrls.js`
- **Features**:
  - Generates signed URLs for private access
  - Family-scoped access control

### 10. **AWS SES Email Service**
- **File**: `backend/utils/sesEmail.js`
- **Features**:
  - Sends emails via AWS SES
  - Templated email support

### 11. **Lambda Email Notifications**
- **File**: `backend/lambdas/emailNotifications.js`
- **Features**:
  - Birthday reminders
  - Anniversary reminders
  - Daily scheduled triggers

## 🚀 Quick Start Guide

### To Use Website Admin:

1. **Login** to the application
2. **Click "Website Admin"** in the sidebar (or go to `/website-admin`)
3. **Select a family** from the dropdown
4. **Configure website**:
   - Enter site title, header, footer text
   - Choose theme (light/dark)
   - Enter domain name
   - Click "Save Configuration"

5. **Create pages**:
   - Click "+ Add Page"
   - Select page type
   - Enter page title
   - Click "Create Page"

6. **Add content blocks**:
   - Click "Edit" on a page
   - Click content block type buttons (Hero, Text, Image, etc.)
   - Content blocks will be added automatically

7. **Preview**:
   - Click "Preview" button
   - Website opens in new tab

8. **Publish**:
   - Click "Publish to S3" button
   - Website is deployed to S3
   - Get S3 URL and CloudFront URL

## 📁 File Structure

```
fami-app/
├── backend/
│   ├── routes/
│   │   └── websiteAdmin.js          # Website admin API routes
│   ├── services/
│   │   ├── websiteGenerator.js      # Static page generation
│   │   ├── s3Publisher.js           # S3 publishing
│   │   └── cloudfrontConfig.js       # CloudFront setup
│   ├── utils/
│   │   ├── s3SignedUrls.js          # Private S3 access
│   │   └── sesEmail.js              # AWS SES email
│   ├── lambdas/
│   │   └── emailNotifications.js    # Email notifications
│   └── database/
│       └── schema.sql               # PostgreSQL schema
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   └── WebsiteAdmin.tsx     # Website admin UI
    │   └── styles/
    │       └── WebsiteAdmin.css     # Admin page styles
```

## ✅ What's Working

- ✅ Website Admin page accessible from sidebar
- ✅ Family selection dropdown
- ✅ Website configuration form
- ✅ Page creation and management
- ✅ Content block system (10 types)
- ✅ Preview functionality
- ✅ S3 publishing
- ✅ CloudFront integration
- ✅ PostgreSQL database
- ✅ Migration completed (128 records)

## 🔍 Troubleshooting

**Can't see "Website Admin" in sidebar?**
- Make sure you're logged in
- Refresh the page
- Check browser console for errors

**No families in dropdown?**
- Create a family first (go to "My Families")
- Or check if families exist in database

**Preview/Published not working?**
- Check backend logs for errors
- Verify AWS credentials in `.env`
- Ensure S3 bucket exists

**Pages not saving?**
- Check browser console for API errors
- Verify PostgreSQL is running
- Check backend logs

## 📞 Need Help?

Check these files for more details:
- `UNIFIED_FAMILY_PORTAL_README.md` - Complete setup guide
- `BRD_COMPLIANCE.md` - BRD compliance checklist
- `POSTGRES_SETUP_GUIDE.md` - Database setup guide
