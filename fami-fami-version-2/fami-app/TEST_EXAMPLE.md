# 🧪 Test Example: AI Website Generation

## 📋 Prerequisites

Before testing, ensure:
1. ✅ Backend server is running (`npm start` in `backend/` folder)
2. ✅ Frontend is running (`npm start` in `frontend/` folder)
3. ✅ PostgreSQL is running (`docker-compose -f docker-compose.postgres.yml up -d`)
4. ✅ Ollama is running (`ollama serve`)
5. ✅ You are logged in to the application
6. ✅ You have at least one family created

---

## 🎯 Test Example 1: Basic Family Website

### **Step 1: Navigate to Website Admin**

1. Open your browser: `http://localhost:3000`
2. Login with your credentials
3. Navigate to **Website Administration** page
4. Select a family from the dropdown

### **Step 2: Fill in Website Configuration**

Fill in the form with these test values:

**Website Configuration Panel (Left Side):**

```
Site Title:        "Smith Family Portal"
Header Text:       "Welcome to the Smith Family! We are a close-knit family of 5, 
                    celebrating our heritage and creating memories together."
Footer Text:       "© 2024 Smith Family Portal. All rights reserved. 
                    Connecting generations, preserving memories."
Theme:             Light
```

**Note:** You have two options:

**Option A: Save Configuration First (Recommended)**
1. Click **"Save Configuration"** button (saves your form values to database)
2. Then click **"🤖 Generate"** button

**Option B: Generate Directly (Faster)**
1. Just click **"🤖 Generate"** button directly
2. The AI generation will automatically save your configuration

> 💡 **Tip:** Option B is faster - the "Generate" button will use your form values and save them automatically. You only need "Save Configuration" if you want to save without generating pages.

### **Step 3: Click Generate**

1. Click the **"🤖 Generate"** button (purple button, top right)
2. Confirm the dialog: "This will generate pages using AI based on your current configuration. Continue?"
3. Wait 30-60 seconds for AI to generate

### **Step 4: Expected Result**

✅ **Success Message:**
```
✅ Website generated successfully! Created 4-6 pages.
```

✅ **Pages Created (in Pages panel, right side):**
- Home (homepage)
- About Us (about)
- Contact (contact)
- Gallery (gallery)
- Events (events) - if applicable
- Family Tree (family-tree) - if applicable

✅ **Each page should have:**
- Page title
- Page slug
- Route path
- Content blocks (hero, text, etc.)

### **Step 5: Verify Generated Content**

1. Click **"Preview"** button to see the generated website
2. Check that pages have AI-generated content:
   - Hero sections with titles
   - Text blocks with headings and body text
   - Proper navigation

---

## 🎯 Test Example 2: Custom Requirements

### **Step 1: Fill in Configuration**

```
Site Title:        "The Johnson Family"
Header Text:       "We are a family of 8 spanning 3 generations. 
                    Our website showcases our family history, recipes, 
                    and annual family reunions."
Footer Text:       "© 2024 The Johnson Family. 
                    Preserving our legacy for future generations."
Theme:             Dark
```

### **Step 2: Click Generate**

- Click **"🤖 Generate"**
- Wait for generation

### **Step 3: Expected Result**

✅ **Pages should include:**
- Homepage with family introduction
- About page with family history
- Gallery page
- Contact page
- Possibly: Blog, Recipes, Timeline (based on AI interpretation)

---

## 🎯 Test Example 3: Minimal Input

### **Step 1: Fill in Minimal Configuration**

```
Site Title:        "My Family"
Header Text:       "Welcome"
Footer Text:       "© 2024"
Theme:             Light
```

### **Step 2: Click Generate**

- Click **"🤖 Generate"**
- Wait for generation

### **Step 3: Expected Result**

✅ **AI should still generate:**
- Basic website structure
- Standard pages (Home, About, Contact)
- Content blocks with AI-generated text

---

## 🔍 What to Check

### **✅ Success Indicators:**

1. **Console Logs (Browser DevTools):**
   ```
   🤖 Generating website with AI using current config...
   Config: { siteTitle: "Smith Family Portal", ... }
   ```

2. **Backend Console:**
   ```
   🤖 AI Website Generation Request
     Family ID: 699b502f28b846afa3d038e3
     Customer Details: { familyName: "Smith Family Portal", ... }
   🤖 Generating website structure with Ollama...
   ✅ AI Generated 4 pages successfully
   ```

3. **Pages List Updates:**
   - New pages appear in the "Pages" panel
   - Each page shows: title, type, route path

4. **Preview Works:**
   - Click "Preview" button
   - Website opens in new tab
   - All pages are accessible
   - Content is displayed correctly

### **❌ Error Indicators:**

1. **"Ollama is not running"**
   - **Fix**: Start Ollama: `ollama serve`

2. **"API route not found"**
   - **Fix**: Restart backend server

3. **"PostgreSQL connection refused"**
   - **Fix**: Start PostgreSQL: `docker-compose -f docker-compose.postgres.yml up -d`

4. **"Please enter a Site Title first"**
   - **Fix**: Make sure Site Title field has a value

---

## 📝 Test Checklist

- [ ] Backend server running
- [ ] Frontend running
- [ ] PostgreSQL running
- [ ] Ollama running
- [ ] Logged in to application
- [ ] Family selected
- [ ] Site Title filled
- [ ] Clicked "Generate" button
- [ ] Confirmed dialog
- [ ] Waited 30-60 seconds
- [ ] Success message received
- [ ] Pages appear in list
- [ ] Preview works
- [ ] Content is generated

---

## 🐛 Debugging Tips

### **Check Ollama Status:**

```bash
# In terminal
curl http://localhost:11434/api/tags
# Should return: {"models":[...]}

# Or
ollama list
# Should show: llama3.2, etc.
```

### **Check Backend Logs:**

Look for:
- `🤖 AI Website Generation Request`
- `🤖 Generating website structure with Ollama...`
- `✅ AI Generated X pages successfully`

### **Check Frontend Console:**

Open Browser DevTools (F12) → Console tab:
- Look for API request logs
- Check for any errors

### **Check Database:**

```sql
-- Connect to PostgreSQL
SELECT * FROM website_configs WHERE family_id = 'YOUR_FAMILY_ID';
SELECT * FROM website_pages WHERE family_id = 'YOUR_FAMILY_ID';
SELECT * FROM page_content_blocks;
```

---

## 🎬 Quick Test Script

**Copy and paste this into your form:**

```
Site Title:    Test Family Website
Header Text:   Welcome to our family portal. We are a family of 4, 
               sharing our memories and staying connected.
Footer Text:   © 2024 Test Family Website. All rights reserved.
Theme:         Light
```

Then click **"🤖 Generate"** and wait!

---

## 📊 Expected Output Example

After generation, you should see in the **Pages** panel:

```
Pages
+ Add Page

home
custom | /home
[Edit] [Delete]

about
custom | /about
[Edit] [Delete]

contact
custom | /contact
[Edit] [Delete]

gallery
custom | /gallery
[Edit] [Delete]
```

Each page will have content blocks that you can view by clicking **"Edit"**.

---

## ✅ Success Criteria

The test is successful if:
1. ✅ No errors in console
2. ✅ Success message appears
3. ✅ 4-6 pages are created
4. ✅ Pages appear in the list
5. ✅ Preview button works
6. ✅ Website displays correctly
7. ✅ Content is AI-generated and relevant

---

## 🚀 Next Steps After Testing

Once generation is successful:
1. Click **"Preview"** to see the website
2. Click **"Edit"** on any page to modify content
3. Add more content blocks if needed
4. Click **"Publish to S3"** to deploy the website

---

## 💡 Tips

- **First generation takes longer** (30-60 seconds) - be patient!
- **Ollama needs to be running** - check with `ollama list`
- **Backend must be restarted** after code changes
- **Check browser console** for detailed error messages
- **More detailed input** = better AI-generated content

---

Happy Testing! 🎉
