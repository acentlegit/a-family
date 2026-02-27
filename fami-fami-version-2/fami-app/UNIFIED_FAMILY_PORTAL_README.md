# Unified Family Portal - Complete Integration Guide

## Overview

This is a unified family portal that combines three major components:
1. **Family Portal** (fami-app) - Family tree, events, gallery, members management
2. **Website Generator** (WebsiteGen) - Static page generation and publishing
3. **Admin Configuration System** - Dynamic page configuration and content management

## Architecture

### Database: PostgreSQL
- Replaced MongoDB with PostgreSQL for better integration
- Schema includes: users, families, members, events, media_files, website_pages, page_content_blocks, website_configs

### Backend Services
- **Express.js API** - Main backend server
- **PostgreSQL** - Database for all data
- **S3 Storage** - Static website hosting and media files
- **CloudFront** - CDN for HTTPS delivery
- **AWS Lambda** - Email notifications (birthdays, anniversaries)

### Frontend
- **React + TypeScript** - Main frontend application
- **Admin Dashboard** - Website configuration and page management
- **Family Features** - Tree, gallery, events, members

## Key Features

### 1. Website Administration
- **Page Configuration**: Create and manage multiple pages (homepage, contact, blog, gallery, events, family-tree, custom)
- **Content Blocks**: Add different types of content blocks (hero, text, image, gallery, form, custom)
- **Preview**: Preview website before publishing
- **Publish to S3**: Deploy static pages to AWS S3 bucket

### 2. Family Management
- Family tree visualization
- Member management
- Events and RSVP
- Media gallery with S3 storage
- Albums organization

### 3. Email Notifications
- AWS Lambda function for automated emails
- Birthday reminders
- Anniversary reminders
- Daily scheduled triggers

## Setup Instructions

### 1. Database Setup

```bash
# Install PostgreSQL (if not already installed)
# Create database
createdb family_portal

# Run schema
psql -d family_portal -f backend/database/schema.sql
```

### 2. Environment Variables

Create `.env` file in `backend/` directory:

```env
# PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=family_portal
PG_USER=postgres
PG_PASSWORD=your_password

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=family-portal-sites
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# SendGrid (for emails)
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@yourdomain.com

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=5000
NODE_ENV=development
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Run Application

```bash
# Backend (from backend directory)
npm start

# Frontend (from frontend directory)
npm start
```

## API Endpoints

### Website Administration

- `GET /api/website-admin/config/:familyId` - Get website configuration
- `POST /api/website-admin/config/:familyId` - Save website configuration
- `GET /api/website-admin/pages/:familyId` - Get all pages
- `POST /api/website-admin/pages/:familyId` - Create new page
- `PUT /api/website-admin/pages/:pageId` - Update page
- `DELETE /api/website-admin/pages/:pageId` - Delete page
- `POST /api/website-admin/preview/:familyId` - Generate preview
- `POST /api/website-admin/publish/:familyId` - Publish to S3

### Family Management (Existing)

- `GET /api/families` - Get families
- `GET /api/members/:familyId` - Get family members
- `GET /api/family-tree/:familyId` - Get family tree
- `GET /api/events/:familyId` - Get events
- `GET /api/media/:familyId` - Get media files

## Usage Guide

### 1. Configure Website

1. Navigate to `/website-admin/:familyId` in the frontend
2. Fill in website configuration:
   - Site Title
   - Header Text
   - Footer Text
   - Theme (Light/Dark)
   - Domain
3. Click "Save Configuration"

### 2. Create Pages

1. Click "+ Add Page" button
2. Select page type (homepage, contact, blog, gallery, events, family-tree, custom)
3. Enter page title (slug and route will auto-generate)
4. Click "Create Page"

### 3. Add Content Blocks

1. Select a page to edit
2. Click on content block type buttons:
   - **Hero**: Large header section with title and image
   - **Text**: Text content with heading and body
   - **Image**: Single image with caption
   - **Gallery**: Image gallery grid
   - **Form**: Contact or custom form
3. Edit content data in the JSON editor

### 4. Preview Website

1. Click "Preview" button
2. Website will open in a new tab
3. Review all pages and content

### 5. Publish to S3

1. Click "Publish to S3" button
2. System will:
   - Generate static HTML files
   - Upload to S3 bucket
   - Return S3 URL and CloudFront URL (if configured)
3. Website is now live!

## AWS Lambda Setup

### Deploy Email Notifications Lambda

1. Navigate to `backend/lambdas/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Zip the function:
   ```bash
   zip -r emailNotifications.zip emailNotifications.js package.json node_modules/
   ```
4. Upload to AWS Lambda via Console or CLI
5. Configure environment variables:
   - PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD
   - SENDGRID_API_KEY, FROM_EMAIL
6. Set up EventBridge rule to trigger daily:
   - Schedule: `cron(0 9 * * ? *)` (9 AM daily)

## File Structure

```
fami-app/
├── backend/
│   ├── database/
│   │   ├── schema.sql          # PostgreSQL schema
│   │   └── pgClient.js         # PostgreSQL client
│   ├── routes/
│   │   └── websiteAdmin.js     # Website admin routes
│   ├── services/
│   │   ├── websiteGenerator.js # Static page generation
│   │   └── s3Publisher.js      # S3 publishing service
│   ├── lambdas/
│   │   └── emailNotifications.js # Lambda function
│   └── server.js               # Main server
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── WebsiteAdmin.tsx # Admin page component
│   │   └── styles/
│   │       └── WebsiteAdmin.css  # Admin styles
│   └── ...
└── generated_sites/            # Generated static sites (local)
```

## Integration Points

### WebsiteGen Integration
- `websiteGenerator.js` uses similar logic to WebsiteGen's `siteGenerator.ts`
- Generates static HTML pages with content blocks
- Supports multiple page types and themes

### Family Portal Integration
- All existing family features remain functional
- Family tree, events, gallery integrated into website pages
- Media files stored in S3 with metadata in PostgreSQL

## Customization

### Adding New Page Types

1. Add page type to `website_pages.page_type` enum in schema
2. Update `WebsiteAdmin.tsx` page type dropdown
3. Add rendering logic in `websiteGenerator.js` `generatePageHTML()`

### Adding New Content Block Types

1. Add block type to `page_content_blocks.block_type` enum
2. Update `WebsiteAdmin.tsx` block actions
3. Add rendering logic in `websiteGenerator.js` `renderContentBlocks()`

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`
- Check firewall rules

### S3 Upload Issues
- Verify AWS credentials
- Check bucket permissions
- Ensure bucket exists

### Preview Not Working
- Check backend logs for errors
- Verify pages have content blocks
- Ensure familyId is correct

## Future Enhancements

- [ ] WYSIWYG editor for content blocks
- [ ] Image upload and management
- [ ] Blog post management system
- [ ] SEO optimization
- [ ] Analytics integration
- [ ] Multi-language support
- [ ] Custom domain configuration
- [ ] SSL certificate automation

## Support

For issues or questions, refer to:
- Backend logs: `backend/server_output.txt`
- Frontend logs: Browser console
- Database: PostgreSQL logs

## License

[Your License Here]
