# 📋 BRD Requirements Explanation & Application Architecture

## 🎯 Executive Summary

**Project**: Arakala Family Portal (Generic Family Portal Platform)  
**Domain**: arakala.net (configurable per family)  
**Deployment**: AWS (CloudFront, EC2, S3, RDS, Lambda)

The application is a **generic, customizable family portal platform** that allows any family to:
1. Create their own private family website
2. Configure pages dynamically through an admin interface
3. Generate static websites that are published to S3
4. Integrate family data (tree, gallery, events) into the website

---

## 📊 Business Requirements Breakdown

### 1. **Core Concept: Generic Platform**

**Requirement**: Make it useful for ALL families, not just one specific family.

**How It Works**:
- Each family gets their own website configuration
- Admin can configure: site title, header, footer, theme, domain
- Admin can create unlimited pages (homepage, contact, blog, gallery, etc.)
- Each page can have multiple content blocks
- Everything is stored in PostgreSQL and can be customized per family

**Current Implementation**: ✅
- `WebsiteAdmin.tsx` - Admin interface for configuration
- `website_configs` table - Stores per-family website settings
- `website_pages` table - Stores pages for each family
- Family selection dropdown - Switch between families

---

### 2. **Admin Page for Dynamic Page Generation**

**Requirement**: Admin page where users can:
- Decide how many pages they want (4 pages, 10 pages, etc.)
- Choose page types (homepage, contact, blog, gallery, events, family tree, custom)
- Configure content for each page
- Preview before publishing
- Publish all static pages to S3

**How It Works**:
```
Admin Interface → Configure Pages → Generate HTML → Preview → Publish to S3
```

**Current Implementation**: ✅
- **Admin Page**: `frontend/src/pages/WebsiteAdmin.tsx`
- **Page Creation**: Click "+ Add Page" → Select type → Enter title → Create
- **Content Blocks**: Each page can have multiple blocks (Hero, Text, Image, Gallery, etc.)
- **Preview**: Generates static HTML locally, serves at `/preview/family-{id}/index.html`
- **Publish**: Uploads all pages to S3, creates CloudFront distribution

**Page Types Available**:
- Homepage
- Contact
- Blog
- Gallery
- Events
- Family Tree
- Custom (user-defined)

---

### 3. **Content Blocks System**

**Requirement**: Each page should have content blocks where users can:
- Type/copy-paste content
- Add images, videos, forms
- Configure layout and styling

**How It Works**:
- Each page has multiple content blocks
- Blocks are stored in `page_content_blocks` table
- Each block has a type and JSON content data
- Blocks are rendered in order on the page

**Content Block Types** (10+ types):
1. **Hero** - Large header with title, subtitle, image
2. **Text** - Text content with heading and body
3. **Image** - Single image with caption
4. **Gallery** - Image gallery (auto-populated from family media)
5. **Family Tree** - D3.js visualization (auto-populated from family data)
6. **Events** - Events listing with RSVP (auto-populated)
7. **Bio Data** - Family member profiles (auto-populated)
8. **Form** - Contact or custom forms
9. **Video** - Embedded videos
10. **Map** - Google Maps integration
11. **Timeline** - Event timeline
12. **Testimonial** - Testimonial cards
13. **Stats** - Statistics/metrics display

**Current Implementation**: ✅
- Content blocks stored in PostgreSQL
- JSON-based flexible content structure
- Auto-population from family data (gallery, events, tree)

---

### 4. **Static Page Generation**

**Requirement**: Generate static HTML pages (no server-side rendering needed)

**How It Works**:
1. Admin configures pages and content blocks
2. User clicks "Preview" → Backend generates static HTML
3. HTML files saved to `generated_sites/family-{id}/`
4. User clicks "Publish" → All HTML files uploaded to S3
5. CloudFront distribution created for HTTPS access

**Current Implementation**: ✅
- `websiteGenerator.js` - Generates static HTML from page configs
- Integrates family data (tree, gallery, events) into pages
- Supports multiple themes (light/dark)
- All pages are static HTML (no backend needed after generation)

**File Structure After Generation**:
```
generated_sites/
└── family-699b502f28b846afa3d038e3/
    ├── index.html (homepage)
    ├── about/
    │   └── index.html
    ├── contact/
    │   └── index.html
    └── gallery/
        └── index.html
```

---

### 5. **Integration of Three Codebases**

**Requirement**: Combine:
1. **Family Application** (fami-app) - Family tree, gallery, events, members
2. **WebGen Codebase** - Static page generation
3. **Video Service** - Video functionality

**How It Works**:
- **Family Data**: Stored in PostgreSQL (members, events, media, tree)
- **Website Generator**: Uses WebGen logic to generate pages
- **Family Integration**: Website pages automatically pull data from family database
  - Gallery page → Shows family photos from `media_files` table
  - Events page → Shows family events from `events` table
  - Family Tree page → Shows tree from `family_tree_relationships` table
  - Bio Data page → Shows member profiles from `members` table

**Current Implementation**: ✅
- All three codebases integrated
- Family data automatically integrated into generated pages
- Video support included

---

### 6. **Database Architecture**

**Requirement**: Use PostgreSQL for:
- User access management
- User registration details
- Contact information
- Media metadata (file name, size, uploader, S3 key)

**Database Tables**:

**User Management**:
- `users` - User accounts, roles, authentication
- `families` - Family groups
- `members` - Family members with relationships

**Website Configuration**:
- `website_configs` - Site settings per family
- `website_pages` - Page definitions
- `page_content_blocks` - Content blocks for pages

**Family Data**:
- `media_files` - Media metadata (S3 keys, file info)
- `events` - Family events
- `family_tree_relationships` - Family tree structure
- `albums` - Photo albums

**Current Implementation**: ✅
- Complete PostgreSQL schema
- File size restrictions (10MB images, 50MB videos, 100MB max)
- Media metadata tracking

---

### 7. **S3 Publishing & CloudFront**

**Requirement**: 
- Publish static pages to S3
- Create CloudFront distribution
- HTTPS enforcement
- Custom domain support

**How It Works**:
1. Admin clicks "Publish to S3"
2. Backend generates all static HTML files
3. Uploads to S3 bucket: `s3://bucket-name/family-{id}/`
4. Creates CloudFront distribution
5. Returns S3 URL and CloudFront URL

**Current Implementation**: ✅
- `s3Publisher.js` - Handles S3 uploads
- `cloudfrontConfig.js` - Creates CloudFront distributions
- HTTPS enforcement enabled
- Custom domain support

---

### 8. **Email Notifications (Lambda + SES)**

**Requirement**: 
- Lambda function scheduled daily
- Send birthday and anniversary reminders
- Use AWS SES for email delivery

**How It Works**:
1. Lambda function runs daily (scheduled trigger)
2. Queries PostgreSQL for birthdays/anniversaries today
3. Sends email via AWS SES
4. Email includes family member details

**Current Implementation**: ✅
- `emailNotifications.js` - Lambda function
- Supports both SES and SendGrid
- Birthday and anniversary reminders
- Daily scheduled triggers

---

## 🔄 How Application Adapts to User Requirements

### Scenario 1: Family Wants 4 Pages
1. Admin selects family
2. Creates 4 pages: Homepage, About, Contact, Gallery
3. Adds content blocks to each page
4. Clicks "Preview" → Sees 4-page website
5. Clicks "Publish" → 4 pages uploaded to S3

### Scenario 2: Family Wants 10 Pages
1. Admin selects family
2. Creates 10 pages: Homepage, About, Contact, Blog, Gallery, Events, Family Tree, Bio Data, Timeline, Custom
3. Configures each page with content blocks
4. Clicks "Preview" → Sees 10-page website
5. Clicks "Publish" → 10 pages uploaded to S3

### Scenario 3: Custom Page Requirements
1. Admin selects "Custom" page type
2. Describes requirement (e.g., "Bio data page for family members")
3. System creates custom page template
4. Admin adds content blocks
5. Page generated with family member data automatically

### Scenario 4: New Customer Setup
1. Copy entire codebase
2. Configure new domain (e.g., `smithfamily.net`)
3. Create new family in database
4. Admin configures pages for new family
5. Publish to S3 with new domain
6. CloudFront distribution created

---

## ✨ Features That Can Be Added

### 1. **Additional Page Types**
- **Blog** - Full blog system with posts, categories, tags
- **News** - News/announcements page
- **Recipes** - Family recipe collection
- **Memories** - Timeline of family memories
- **Achievements** - Family achievements and milestones
- **Travel** - Travel logs and photos

### 2. **Enhanced Content Blocks**
- **Calendar** - Interactive calendar widget
- **Weather** - Weather widget
- **Social Media** - Social media feed integration
- **Donation** - Donation/payment forms
- **RSVP Form** - Event RSVP forms
- **Photo Slider** - Carousel/slider for photos
- **Video Gallery** - Video collection display
- **Document Library** - PDF/document downloads

### 3. **Advanced Features**
- **Multi-language Support** - Translate pages to multiple languages
- **SEO Optimization** - Meta tags, sitemap generation
- **Analytics Integration** - Google Analytics, custom tracking
- **Search Functionality** - Search across all pages
- **Comments System** - Comments on blog posts/pages
- **Newsletter** - Email newsletter signup
- **Member Login** - Private pages for family members only
- **Photo Tagging** - Tag people in photos
- **Event Calendar** - Full calendar view of events

### 4. **Customization Options**
- **Custom Themes** - More theme options beyond light/dark
- **Color Schemes** - Custom color palettes
- **Font Selection** - Choose fonts for website
- **Layout Options** - Different layout templates
- **Header/Footer Customization** - More header/footer options
- **Logo Upload** - Upload custom logo
- **Favicon** - Custom favicon

### 5. **Integration Features**
- **WhatsApp Integration** - Send notifications via WhatsApp
- **Social Media Sharing** - Share pages on social media
- **Google Maps** - Interactive maps for locations
- **YouTube Integration** - Embed YouTube videos
- **Instagram Feed** - Display Instagram photos
- **Facebook Integration** - Facebook events, posts

### 6. **Admin Enhancements**
- **WYSIWYG Editor** - Rich text editor for content blocks
- **Image Upload** - Upload images directly in admin
- **Drag & Drop** - Reorder content blocks by dragging
- **Page Templates** - Pre-built page templates
- **Bulk Operations** - Edit multiple pages at once
- **Version History** - Track changes to pages
- **Backup/Restore** - Backup website configuration

### 7. **Security & Access Control**
- **Member-Only Pages** - Private pages for family members
- **Password Protection** - Password-protect specific pages
- **Role-Based Access** - Different access levels
- **Audit Logs** - Track who made what changes
- **Two-Factor Authentication** - Enhanced security

---

## 🏗️ Technical Architecture

```
User Browser
    ↓
CloudFront (HTTPS)
    ↓
S3 Bucket (Static HTML files)
    ↓
[For Admin/API]
EC2/ECS (Node.js Backend)
    ↓
RDS PostgreSQL (Database)
    ↓
S3 Private Bucket (Media files with signed URLs)
    ↓
Lambda (Email notifications)
    ↓
SES (Email delivery)
```

---

## 📝 Current Status Summary

### ✅ Fully Implemented
- User registration and authentication
- Family tree (needs D3.js verification)
- Events and RSVP management
- Media gallery with S3 storage
- Admin dashboard with role-based access
- Website configuration (title, header, footer, theme)
- Dynamic page creation (unlimited pages)
- Content blocks system (10+ types)
- Preview functionality
- S3 publishing
- CloudFront integration
- PostgreSQL database
- Email notifications (Lambda + SES)
- File size restrictions

### ⚠️ Needs Enhancement
- D3.js integration for family tree visualization
- WYSIWYG editor for content blocks
- More page templates
- Image upload in admin interface
- Blog post management system

### 🔮 Future Enhancements
- WhatsApp integration
- Mobile app
- Advanced analytics
- Multi-language support
- SEO optimization

---

## 🎯 Key Takeaways

1. **Generic Platform**: Works for any family, not just one
2. **Dynamic Configuration**: Admin decides pages and content
3. **Static Generation**: All pages are static HTML (fast, secure)
4. **Family Integration**: Automatically pulls family data into pages
5. **Easy Publishing**: One-click publish to S3 with CloudFront
6. **Scalable**: Can handle unlimited families and pages
7. **Customizable**: Each family can have completely different website

---

## 📚 Related Documentation

- `BRD_COMPLIANCE.md` - Compliance checklist
- `BRD_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `FEATURES_LOCATION_GUIDE.md` - Where to find features
- `IMPLEMENTATION_COMPLETE.md` - Completed features
- `UNIFIED_FAMILY_PORTAL_README.md` - Full documentation
