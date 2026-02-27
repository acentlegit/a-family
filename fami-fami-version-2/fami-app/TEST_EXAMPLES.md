# Test Examples for AI Website Generation

Use these examples to test the website generation feature. Fill in the form fields with the data below.

## Example 1: Family Restaurant Business

**Site Title:** Smith Family Restaurant  
**Description:** A cozy family-owned Italian restaurant serving authentic pasta and pizza since 1985. Located in downtown, we offer traditional recipes passed down through generations.  
**Header Text:** Welcome to Smith Family Restaurant  
**Footer Text:** © 2024 Smith Family Restaurant. Serving authentic Italian cuisine with love.  
**Theme:** Light  
**Number of Pages:** 3  
**Custom Pages:** 
- About Us
- Menu
- Contact

**Expected Result:** A professional restaurant website with menu sections, family story, and contact information.

---

## Example 2: Photography Business

**Site Title:** Johnson Photography Studio  
**Description:** Professional wedding and portrait photography services. Specializing in capturing life's precious moments with artistic flair. Serving clients for over 10 years.  
**Header Text:** Capturing Your Special Moments  
**Footer Text:** © 2024 Johnson Photography Studio. All rights reserved.  
**Theme:** Dark  
**Number of Pages:** 4  
**Custom Pages:**
- Portfolio
- Services
- Pricing
- Contact

**Expected Result:** A photography portfolio website with gallery sections, service descriptions, and pricing information.

---

## Example 3: Family Reunion Portal

**Site Title:** The Anderson Family Reunion 2024  
**Description:** Annual family reunion for the Anderson family. Join us for a weekend of fun, food, and family bonding. All generations welcome!  
**Header Text:** Join Us for the Anderson Family Reunion  
**Footer Text:** © 2024 Anderson Family. See you there!  
**Theme:** Light  
**Number of Pages:** 2  
**Custom Pages:**
- Event Schedule
- RSVP

**Expected Result:** A family reunion website with event details, schedule, and RSVP information.

---

## Example 4: Small Business - Bakery

**Site Title:** Sweet Dreams Bakery  
**Description:** Artisan bakery specializing in custom cakes, fresh pastries, and bread. Made fresh daily with locally sourced ingredients.  
**Header Text:** Fresh Baked Daily  
**Footer Text:** © 2024 Sweet Dreams Bakery. Visit us Monday-Saturday 7am-6pm.  
**Theme:** Light  
**Number of Pages:** 3  
**Custom Pages:**
- Our Products
- Order Online
- Visit Us

**Expected Result:** A bakery website with product showcase, ordering information, and location details.

---

## Example 5: Family Blog/Newsletter

**Site Title:** The Williams Family Chronicles  
**Description:** A family blog sharing stories, updates, and photos from our family adventures. Stay connected with relatives near and far.  
**Header Text:** Welcome to Our Family Story  
**Footer Text:** © 2024 Williams Family. Keeping families connected.  
**Theme:** Light  
**Number of Pages:** 2  
**Custom Pages:**
- Recent Updates
- Photo Gallery

**Expected Result:** A family blog website with news sections and photo galleries.

---

## Testing Checklist

Before testing, ensure:
- [ ] Backend server is running on port 5000
- [ ] Frontend is running on port 3000
- [ ] Ollama is installed and running (`ollama serve`)
- [ ] Ollama model `llama3.2` is installed (`ollama pull llama3.2`)
- [ ] PostgreSQL is running (if using database features)
- [ ] You're logged in to the application

## Testing Steps

1. Navigate to the Website Admin page
2. Select a family from the dropdown
3. Fill in the form with one of the examples above
4. Upload a logo (optional but recommended)
5. Click "Generate with AI" button
6. Wait 1-3 minutes for generation to complete
7. Check the generated website preview
8. Verify all content is real (not placeholder text)
9. Check that images are loading correctly
10. Verify navigation between pages works

## Expected Behavior

✅ **Success Indicators:**
- No error messages appear
- Website generates within 3-5 minutes
- All content is real and relevant (no "Lorem ipsum")
- Images load correctly
- Navigation works between pages
- Logo appears in the header
- Footer contains the specified text

❌ **Error Indicators:**
- Timeout errors (check Ollama is running)
- JSON parsing errors (check backend console)
- Empty website (check Ollama model is installed)
- Placeholder text in content (check prompt in backend)

## Troubleshooting

**If generation fails:**
1. Check backend console for detailed error messages
2. Verify Ollama is running: `ollama list`
3. Check model is installed: `ollama list` should show `llama3.2`
4. Restart backend if needed
5. Check network connectivity

**If content is placeholder text:**
1. Check backend console for the actual prompt sent to Ollama
2. Verify the prompt includes all form data
3. Try a different example with more specific details

**If images don't load:**
1. Check browser console for image loading errors
2. Verify base URL is correct in backend
3. Check that Unsplash URLs are being generated

---

## Quick Test (Minimal Data)

**Site Title:** Test Website  
**Description:** This is a test website for AI generation  
**Header Text:** Welcome  
**Footer Text:** Test Footer  
**Theme:** Light  
**Number of Pages:** 1  
**Custom Pages:** (leave empty)

This minimal example should generate a basic homepage quickly for testing purposes.
