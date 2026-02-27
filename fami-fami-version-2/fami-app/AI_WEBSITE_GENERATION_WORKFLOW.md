# 🤖 AI-Powered Website Generation - Complete Workflow

## 📋 Overview

This document explains the complete workflow of how the AI-powered website generation feature works, from user input to final website creation.

---

## 🔄 Complete Workflow

### **Step 1: User Input (Frontend)**

**Location**: `frontend/src/pages/WebsiteAdmin.tsx`

1. **User fills in the form:**
   - **Site Title**: "my fami" (or any family name)
   - **Header Text**: Welcome message
   - **Footer Text**: Copyright text
   - **Theme**: Light or Dark
   - **Domain**: Optional domain name

2. **User clicks "🤖 Generate" button**

3. **Frontend validation:**
   ```typescript
   - Checks if family is selected
   - Checks if Site Title is filled (reads from input field directly)
   - Shows confirmation dialog
   ```

4. **Frontend prepares data:**
   ```typescript
   customerDetails = {
     familyName: "my fami" (from Site Title)
     description: "Welcome to our family portal..." (from Header Text)
     numberOfPages: 4 (default, or based on existing pages)
     theme: "light" (from Theme dropdown)
     additionalInfo: "© 2024..." (from Footer Text)
   }
   ```

5. **Frontend makes API call:**
   ```
   POST /api/website-admin/generate-with-ai/:familyId
   Body: { customerDetails: {...} }
   ```

---

### **Step 2: Backend Receives Request**

**Location**: `backend/routes/websiteAdmin.js` (line 471)

1. **Route handler receives request:**
   ```javascript
   router.post('/generate-with-ai/:familyId', protect, async (req, res) => {
     // Extract familyId and customerDetails
   })
   ```

2. **Validation:**
   - Checks if `customerDetails` exists
   - Verifies user is authenticated (`protect` middleware)

3. **Check Ollama status:**
   ```javascript
   const ollamaStatus = await checkOllamaStatus();
   // Makes request to http://localhost:11434/api/tags
   // Returns: { running: true/false }
   ```

4. **If Ollama is not running:**
   - Returns error: "Ollama is not running. Please start Ollama: ollama serve"
   - Stops workflow

---

### **Step 3: AI Generation (Ollama Service)**

**Location**: `backend/services/ollamaService.js`

1. **Call `generateWebsiteStructure(customerDetails)`:**
   ```javascript
   // Creates a prompt for Ollama
   prompt = `
     You are a website generator for family portals.
     Generate a website structure with pages and content blocks.
     
     Customer Requirements:
     - Family Name: "my fami"
     - Description: "Welcome to our family portal..."
     - Number of Pages: 4
     - Theme: light
     
     Return JSON with pages and content blocks...
   `
   ```

2. **Send to Ollama API:**
   ```javascript
   POST http://localhost:11434/api/generate
   {
     model: "llama3.2",
     prompt: "...",
     stream: false,
     options: { temperature: 0.7, top_p: 0.9 }
   }
   ```

3. **Ollama processes and returns:**
   ```json
   {
     "pages": [
       {
         "pageType": "homepage",
         "pageTitle": "Home",
         "pageSlug": "home",
         "routePath": "/home",
         "contentBlocks": [
           {
             "blockType": "hero",
             "contentData": {
               "title": "Welcome to My Fami",
               "subtitle": "Connecting our family..."
             }
           },
           {
             "blockType": "text",
             "contentData": {
               "heading": "About Our Family",
               "body": "We are a close-knit family..."
             }
           }
         ]
       },
       {
         "pageType": "about",
         "pageTitle": "About Us",
         "pageSlug": "about",
         "routePath": "/about",
         "contentBlocks": [...]
       },
       // ... more pages
     ],
     "websiteConfig": {
       "siteTitle": "My Fami Portal",
       "headerText": "Welcome to My Fami",
       "footerText": "© 2024 My Fami Portal",
       "theme": "light"
     }
   }
   ```

4. **Extract JSON from response:**
   - Ollama might add extra text before/after JSON
   - Code extracts JSON using regex: `response.match(/\{[\s\S]*\}/)`
   - Parses JSON and returns structure

---

### **Step 4: Database Setup**

**Location**: `backend/routes/websiteAdmin.js` (line 505)

1. **Ensure PostgreSQL tables exist:**
   ```sql
   CREATE TABLE IF NOT EXISTS website_configs (...)
   CREATE TABLE IF NOT EXISTS website_pages (...)
   CREATE TABLE IF NOT EXISTS page_content_blocks (...)
   ```

2. **Check for existing config:**
   ```sql
   SELECT * FROM website_configs WHERE family_id = $1
   ```
   - If exists: Preserve existing values
   - If not: Use AI-generated values

---

### **Step 5: Save Website Configuration**

**Location**: `backend/routes/websiteAdmin.js` (line 576)

1. **Merge existing + AI-generated config:**
   ```javascript
   finalSiteTitle = existingConfig?.site_title || aiConfig.siteTitle || "my fami"
   finalHeaderText = existingConfig?.header_text || aiConfig.headerText || "..."
   finalFooterText = existingConfig?.footer_text || aiConfig.footerText || "..."
   finalTheme = existingConfig?.theme || aiConfig.theme || "light"
   ```

2. **Save to database:**
   ```sql
   INSERT INTO website_configs 
   (family_id, site_title, header_text, footer_text, theme)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (family_id) DO UPDATE SET ...
   ```

---

### **Step 6: Create Pages and Content Blocks**

**Location**: `backend/routes/websiteAdmin.js` (line 596)

**For each page in AI-generated structure:**

1. **Create page record:**
   ```sql
   INSERT INTO website_pages 
   (family_id, page_type, page_title, page_slug, route_path)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (family_id, page_slug) DO UPDATE SET ...
   ```

2. **Delete existing content blocks:**
   ```sql
   DELETE FROM page_content_blocks WHERE page_id = $1
   ```

3. **Insert new content blocks:**
   ```sql
   INSERT INTO page_content_blocks 
   (page_id, block_type, block_order, content_data)
   VALUES ($1, $2, $3, $4)
   ```
   - Loops through each content block from AI
   - Saves block type, order, and content data (JSON)

4. **Track created pages:**
   ```javascript
   createdPages.push(page)
   ```

---

### **Step 7: Return Success Response**

**Location**: `backend/routes/websiteAdmin.js` (line 640)

```javascript
res.json({
  success: true,
  message: "Website generated successfully with X pages",
  pagesCreated: createdPages.length,
  pages: createdPages
})
```

---

### **Step 8: Frontend Updates**

**Location**: `frontend/src/pages/WebsiteAdmin.tsx` (line 144)

1. **Receive success response:**
   ```javascript
   if (response.data.success) {
     alert(`✅ Website generated successfully! Created ${pagesCreated} pages.`)
   }
   ```

2. **Reload data:**
   ```javascript
   await loadConfig()  // Reload website configuration
   await loadPages()   // Reload pages list
   ```

3. **UI updates:**
   - Pages list shows newly created pages
   - User can now:
     - Click "Preview" to see the website
     - Edit pages and content blocks
     - Click "Publish to S3" to deploy

---

## 📊 Data Flow Diagram

```
User Input (Form)
    ↓
Frontend Validation
    ↓
API Call: POST /api/website-admin/generate-with-ai/:familyId
    ↓
Backend Route Handler
    ↓
Check Ollama Status
    ↓
Generate Website Structure (Ollama API)
    ↓
Extract JSON from Ollama Response
    ↓
Ensure Database Tables Exist
    ↓
Save Website Configuration (PostgreSQL)
    ↓
For Each Page:
    ├─ Create Page Record
    ├─ Delete Old Content Blocks
    └─ Insert New Content Blocks
    ↓
Return Success Response
    ↓
Frontend Reloads Data
    ↓
UI Updates with New Pages
```

---

## 🔧 Key Components

### **1. Frontend (`WebsiteAdmin.tsx`)**
- **Function**: `generateWebsiteWithAI()`
- **Purpose**: Collects form data, validates, calls API
- **Key Features**:
  - Reads from input field directly (fallback)
  - Handles both camelCase and snake_case field names
  - Shows loading state and error messages

### **2. Backend Route (`websiteAdmin.js`)**
- **Route**: `POST /api/website-admin/generate-with-ai/:familyId`
- **Purpose**: Orchestrates the generation process
- **Key Features**:
  - Validates request
  - Checks Ollama status
  - Calls AI service
  - Saves to database
  - Returns response

### **3. Ollama Service (`ollamaService.js`)**
- **Functions**:
  - `checkOllamaStatus()` - Verifies Ollama is running
  - `generateWebsiteStructure()` - Generates website structure
  - `generatePageContent()` - Generates content for a page
  - `generateTextContent()` - Generates text content
- **Purpose**: Communicates with Ollama API

### **4. Database (PostgreSQL)**
- **Tables**:
  - `website_configs` - Website settings
  - `website_pages` - Page metadata
  - `page_content_blocks` - Content blocks for each page
- **Purpose**: Stores generated website structure

---

## ⚙️ Configuration

### **Environment Variables**

```env
# Ollama Configuration (Optional)
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# PostgreSQL Configuration
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=family_portal
PG_USER=postgres
PG_PASSWORD=postgres
```

---

## 🎯 Example Flow

### **Input:**
```
Site Title: "my fami"
Header Text: "Welcome to our family portal"
Footer Text: "© 2024 My Fami"
Theme: Light
```

### **AI Generates:**
```json
{
  "pages": [
    {
      "pageType": "homepage",
      "pageTitle": "Home",
      "contentBlocks": [
        {
          "blockType": "hero",
          "contentData": {
            "title": "Welcome to My Fami",
            "subtitle": "Connecting our family across generations"
          }
        }
      ]
    },
    {
      "pageType": "about",
      "pageTitle": "About Us",
      "contentBlocks": [...]
    },
    {
      "pageType": "contact",
      "pageTitle": "Contact",
      "contentBlocks": [...]
    },
    {
      "pageType": "gallery",
      "pageTitle": "Gallery",
      "contentBlocks": [...]
    }
  ]
}
```

### **Database Saves:**
- 1 website configuration record
- 4 page records
- Multiple content block records (varies per page)

### **Result:**
- ✅ Website configuration saved
- ✅ 4 pages created
- ✅ Content blocks populated
- ✅ Ready to preview and publish

---

## 🚨 Error Handling

### **Common Errors:**

1. **"Ollama is not running"**
   - **Cause**: Ollama server not started
   - **Fix**: Run `ollama serve`

2. **"Invalid JSON response from Ollama"**
   - **Cause**: Ollama returned malformed JSON
   - **Fix**: Retry or use different model

3. **"PostgreSQL connection refused"**
   - **Cause**: PostgreSQL not running
   - **Fix**: Start PostgreSQL: `docker-compose -f docker-compose.postgres.yml up -d`

4. **"API route not found"**
   - **Cause**: Backend server not restarted after adding route
   - **Fix**: Restart backend server

---

## ✅ Summary

**Complete Workflow:**
1. User fills form → 2. Clicks Generate → 3. Frontend validates → 4. API call → 5. Backend checks Ollama → 6. AI generates structure → 7. Database saves → 8. Pages created → 9. Frontend updates → 10. Ready to preview/publish

**Time**: ~30-60 seconds (mostly AI generation)

**Result**: Complete website with pages, content blocks, and configuration ready to use!
