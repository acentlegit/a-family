# 📋 Requirements Explained in Simple English

## 🎯 Main Goal

**Create a platform where ANY family can build their own custom website.**

Think of it like **WordPress or Wix, but specifically for families**.

---

## ❓ Key Question: What Can Be Customized?

### ✅ **Each Family Can Customize THEIR OWN Website** (Not the whole application)

**What this means:**
- The **internal application** (Dashboard, Members, Tree, Gallery) stays the same for everyone
- Each **family's public website** (the one visitors see) can be completely different
- Family A might have 4 pages, Family B might have 10 pages
- Each family chooses their own pages, content, and design

**Example:**
- **Smith Family** → Creates website with: Homepage, About, Gallery, Contact (4 pages)
- **Jones Family** → Creates website with: Homepage, About, Blog, Gallery, Events, Family Tree, Bio Data, Timeline, Contact, Recipes (10 pages)

Both families use the same internal app, but their public websites are completely different!

---

## 🔄 How It Works (Simple Workflow)

### **Step 1: Family Signs Up**
```
Family registers → Gets access to internal portal
→ Can manage members, upload photos, create events
```

### **Step 2: Admin Creates Website**
```
Admin goes to "Website Admin" page
→ Selects their family
→ Configures website:
   - Site title: "Smith Family"
   - Theme: Light or Dark
   - Header/Footer text
```

### **Step 3: Admin Creates Pages**
```
Admin clicks "+ Add Page"
→ Chooses page type:
   - Homepage
   - Contact
   - Blog
   - Gallery
   - Events
   - Family Tree
   - Custom (anything they want)
→ Enters page title
→ Creates page
```

**Repeat for as many pages as they want (4, 10, 20, etc.)**

### **Step 4: Admin Adds Content to Each Page**
```
Admin clicks "Edit" on a page
→ Adds content blocks:
   - Hero section (big header with image)
   - Text blocks (type or paste content)
   - Image blocks
   - Gallery (automatically shows family photos)
   - Family Tree (automatically shows family tree)
   - Events (automatically shows family events)
   - Bio Data (automatically shows family members)
→ Saves content
```

### **Step 5: Preview Website**
```
Admin clicks "Preview"
→ System generates static HTML pages
→ Shows complete website in browser
→ Admin can see how it looks before publishing
```

### **Step 6: Publish to S3**
```
Admin clicks "Publish to S3"
→ All HTML pages uploaded to S3 bucket
→ CloudFront distribution created
→ Website is now live at: https://smithfamily.com
→ Anyone can visit and see the website
```

---

## 🏗️ What Needs to Be Built/Combined

### **Three Codebases to Combine:**

#### 1. **Family Application** (Already exists)
- Family tree
- Member management
- Photo gallery
- Events
- Video calls
- **What we use**: All the family data (members, photos, events, tree)

#### 2. **WebGen Codebase** (Already exists)
- Code that generates static HTML pages
- **What we use**: The page generation logic

#### 3. **Video Service** (Already exists)
- Video functionality
- **What we use**: Video features

**Result**: One unified application that combines all three!

---

## 📊 Database Requirements (PostgreSQL)

### **What to Store in PostgreSQL:**

#### 1. **User Management**
- User accounts (email, password, name)
- User roles (Admin, Member)
- Authentication information

#### 2. **Family Information**
- Family details
- Contact information
- Member profiles

#### 3. **Media Metadata** (Important!)
- File name
- File size
- Who uploaded it
- When it was uploaded
- S3 bucket location
- File type (image, video, document)

**Why?** To:
- Track who uploaded what
- Enforce file size limits (no 100MB videos!)
- Know where files are stored in S3
- Show file information in gallery

#### 4. **Website Configuration**
- Website settings per family
- Pages configuration
- Content blocks

---

## 🚫 File Size Restrictions

**Problem**: Can't allow huge files (expensive to store in S3)

**Solution**: Set limits in PostgreSQL
- Images: Max 10MB
- Videos: Max 50MB
- Documents: Max 5MB
- Absolute max: 100MB

**How it works**:
1. User tries to upload file
2. System checks file size
3. If too big → Reject upload
4. If OK → Upload to S3, save metadata in PostgreSQL

---

## 🎨 Customization Levels

### **Level 1: Website Configuration** (Per Family)
- Site title
- Header text
- Footer text
- Theme (light/dark)
- Logo
- Domain name

### **Level 2: Pages** (Per Family)
- How many pages? (4, 10, 20, etc.)
- What types of pages? (Homepage, Contact, Blog, Gallery, etc.)
- Page titles and URLs

### **Level 3: Content Blocks** (Per Page)
- What content on each page?
- Hero sections, text, images, galleries, etc.
- Auto-populated content (gallery shows family photos, events show family events)

### **Level 4: Family Data Integration** (Automatic)
- Gallery page → Automatically shows family photos from database
- Events page → Automatically shows family events from database
- Family Tree page → Automatically shows tree from database
- Bio Data page → Automatically shows member profiles from database

---

## 🔄 Complete Workflow Example

### **Scenario: Smith Family Wants 4-Page Website**

1. **Smith Family registers** → Gets access to portal

2. **Admin configures website**:
   - Title: "Smith Family Portal"
   - Theme: Light
   - Header: "Welcome to the Smith Family"

3. **Admin creates 4 pages**:
   - Homepage
   - About
   - Gallery
   - Contact

4. **Admin adds content**:
   - **Homepage**: Hero section + Text about family
   - **About**: Text blocks with family history
   - **Gallery**: Gallery block (automatically shows family photos)
   - **Contact**: Contact form

5. **Admin previews** → Sees complete 4-page website

6. **Admin publishes** → Website goes live at `smithfamily.com`

**Result**: Smith Family has their own custom 4-page website!

---

### **Scenario: Jones Family Wants 10-Page Website**

1. **Jones Family registers** → Gets access to portal

2. **Admin configures website**:
   - Title: "Jones Family"
   - Theme: Dark
   - Header: "The Jones Family"

3. **Admin creates 10 pages**:
   - Homepage
   - About
   - Blog
   - Gallery
   - Events
   - Family Tree
   - Bio Data
   - Timeline
   - Recipes
   - Contact

4. **Admin adds content to each page**

5. **Admin previews** → Sees complete 10-page website

6. **Admin publishes** → Website goes live at `jonesfamily.com`

**Result**: Jones Family has their own custom 10-page website!

---

## ✅ What's Already Working

- ✅ User registration and login
- ✅ Family management (members, tree, gallery, events)
- ✅ Website admin page
- ✅ Page creation
- ✅ Content blocks
- ✅ Preview functionality
- ✅ S3 publishing
- ✅ PostgreSQL database
- ✅ File size restrictions

---

## 🎯 Summary in One Sentence

**"Create a platform where each family can build their own custom public website (with as many pages as they want), while using the same internal application to manage their family data."**

---

## 🔑 Key Points

1. **Generic Platform**: Works for ANY family, not just one
2. **Flexible Pages**: Families choose how many pages (4, 10, 20, etc.)
3. **Static Generation**: All pages are static HTML (fast, secure)
4. **Auto-Integration**: Family data (photos, events, tree) automatically appears on website
5. **Easy Publishing**: One click to publish to S3
6. **File Management**: PostgreSQL tracks all media files with size limits

---

## 💡 Simple Analogy

Think of it like a **restaurant menu**:
- **Internal App** = Kitchen (same for all restaurants)
- **Public Website** = Menu (each restaurant has different menu items)

All restaurants use the same kitchen equipment, but each restaurant creates their own unique menu!
