# 🤖 Ollama AI Integration Guide

## 🎯 What This Does

**Ollama is now integrated to automatically generate websites based on customer-provided details!**

Instead of manually creating pages and adding content, customers can:
1. Provide basic information about their family and requirements
2. Click "Generate with AI"
3. Ollama automatically creates pages, content blocks, and content
4. Website is ready to preview and publish!

---

## 📋 How It Works

### **Step 1: Customer Provides Details**

Customer fills out a form with:
- **Family Name** (required)
- **Description** (about the family, what they want)
- **Number of Pages** (4, 6, 8, or 10)
- **Theme** (Light or Dark)
- **Additional Information** (specific requirements)

### **Step 2: AI Generates Website Structure**

Ollama receives the customer details and generates:
- Website configuration (title, header, footer, theme)
- List of pages with types (Homepage, About, Contact, Gallery, etc.)
- Content blocks for each page
- Content for text blocks (headings, body text)

### **Step 3: System Creates Pages**

Backend automatically:
- Saves website configuration to database
- Creates all pages in database
- Adds content blocks to each page
- Website is ready!

### **Step 4: Preview & Publish**

Customer can:
- Preview the AI-generated website
- Edit any content if needed
- Publish to S3

---

## 🚀 Setup Instructions

### **1. Install Ollama**

**Windows:**
1. Download from: https://ollama.ai/download
2. Install the application
3. Ollama will start automatically

**Mac/Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### **2. Pull a Model**

Ollama needs a language model. Recommended models:

```bash
# Option 1: Llama 3.2 (Recommended - Good balance)
ollama pull llama3.2

# Option 2: Mistral (Fast and efficient)
ollama pull mistral

# Option 3: CodeLlama (Good for structured output)
ollama pull codellama
```

### **3. Start Ollama Server**

Ollama should start automatically, but if not:

```bash
ollama serve
```

**Verify it's running:**
```bash
curl http://localhost:11434/api/tags
```

Should return list of available models.

### **4. Configure Environment (Optional)**

If Ollama is running on a different host/port, add to `.env`:

```env
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

---

## 🎨 How to Use

### **In the Application:**

1. **Go to Website Admin** page
2. **Select a family** from dropdown
3. **Click "🤖 Generate with AI"** button
4. **Fill out the form:**
   - Family Name: "Smith Family"
   - Description: "We're a family of 5, want a website with family photos, events, and our family history"
   - Number of Pages: 6
   - Theme: Light
   - Additional Info: "Include a blog page and recipes page"
5. **Click "🤖 Generate Website"**
6. **Wait for AI to generate** (30-60 seconds)
7. **Website is created!** All pages and content are ready
8. **Click "Preview"** to see the website
9. **Edit if needed** or **Publish to S3**

---

## 📊 What AI Generates

### **Website Configuration:**
- Site title (based on family name)
- Header text (welcoming message)
- Footer text (copyright)
- Theme (as selected)

### **Pages:**
- Homepage (with hero section)
- About (with family history text)
- Contact (with contact form)
- Gallery (auto-populated from family photos)
- Events (auto-populated from family events)
- Family Tree (auto-populated from family data)
- Additional pages based on requirements

### **Content Blocks:**
- **Hero blocks**: Title and subtitle
- **Text blocks**: Headings and body text (AI-generated)
- **Gallery blocks**: Auto-populated from family photos
- **Form blocks**: Contact forms
- **Other blocks**: Based on page type

---

## 🔧 Technical Details

### **API Endpoints:**

1. **Check Ollama Status:**
   ```
   GET /api/website-admin/ollama-status
   ```

2. **Generate Website with AI:**
   ```
   POST /api/website-admin/generate-with-ai/:familyId
   Body: {
     customerDetails: {
       familyName: "Smith Family",
       description: "...",
       numberOfPages: 6,
       theme: "light",
       additionalInfo: "..."
     }
   }
   ```

### **Ollama Service:**

**File**: `backend/services/ollamaService.js`

**Functions:**
- `checkOllamaStatus()` - Check if Ollama is running
- `generateWebsiteStructure()` - Generate website structure from customer details
- `generatePageContent()` - Generate content for a specific page
- `generateTextContent()` - Generate text content for blocks

### **How AI Prompt Works:**

The system sends a prompt to Ollama like:
```
You are a website generator for family portals. Based on the following customer requirements, generate a website structure with pages and content blocks.

Customer Requirements:
{
  "familyName": "Smith Family",
  "description": "We're a family of 5...",
  "numberOfPages": 6,
  "theme": "light"
}

Generate a JSON response with pages and content blocks...
```

Ollama returns JSON with website structure, which is then saved to database.

---

## ⚠️ Troubleshooting

### **Error: "Ollama is not running"**

**Solution:**
1. Check if Ollama is installed
2. Start Ollama: `ollama serve`
3. Verify: `curl http://localhost:11434/api/tags`

### **Error: "Model not found"**

**Solution:**
```bash
ollama pull llama3.2
```

### **Error: "Invalid JSON response"**

**Solution:**
- Ollama sometimes adds extra text before/after JSON
- System tries to extract JSON automatically
- If it fails, try a different model or regenerate

### **Slow Generation**

**Solution:**
- Use a smaller/faster model: `ollama pull mistral`
- Or use a more powerful computer
- Generation takes 30-60 seconds typically

---

## 🎯 Example Use Cases

### **Use Case 1: Quick Website Setup**

**Customer says:**
- "I want a 4-page website for my family"
- "Include homepage, about, gallery, and contact"

**AI generates:**
- Homepage with hero and welcome text
- About page with family history
- Gallery page (auto-populated)
- Contact page with form

**Result:** Complete website in 1 minute!

---

### **Use Case 2: Custom Requirements**

**Customer says:**
- "I want 10 pages including blog, recipes, and timeline"
- "Theme should be dark"
- "Include family tree and bio data pages"

**AI generates:**
- All 10 pages with appropriate content
- Dark theme applied
- Family tree and bio data pages (auto-populated from family data)

**Result:** Custom website matching requirements!

---

## ✅ Benefits

1. **Saves Time**: No need to manually create pages and type content
2. **Consistent Quality**: AI generates professional content
3. **Flexible**: Can generate any number of pages
4. **Customizable**: Still can edit after generation
5. **Fast**: Complete website in 30-60 seconds

---

## 🔮 Future Enhancements

- [ ] Support for multiple languages
- [ ] Image generation for hero sections
- [ ] SEO optimization suggestions
- [ ] Content refinement based on feedback
- [ ] Template selection (modern, classic, minimalist, etc.)

---

## 📝 Summary

**Ollama Integration = AI-Powered Website Generation**

1. ✅ Customer provides details
2. ✅ AI generates website structure and content
3. ✅ System creates pages automatically
4. ✅ Website ready to preview and publish!

**No more manual page creation - AI does it all!**
