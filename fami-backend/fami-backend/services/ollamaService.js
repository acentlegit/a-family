const axios = require('axios');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Ollama Service - AI-Powered Website Generation
 * Uses Ollama to generate website content based on customer requirements
 */

// Ollama API endpoint
// In production, OLLAMA_API_URL must be set in environment variables
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || (process.env.NODE_ENV === 'production' ? null : 'http://localhost:11434');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'; // or 'mistral', 'codellama', etc.

// Validate Ollama URL in production
if (process.env.NODE_ENV === 'production' && !OLLAMA_API_URL) {
  console.warn('⚠️  OLLAMA_API_URL not set in production. Ollama features will not work.');
}

/**
 * Call Ollama API to generate content
 */
async function callOllama(prompt, model = OLLAMA_MODEL) {
  try {
    // Use Ollama CLI as primary method since API endpoints may not be available
    console.log('🔄 Using Ollama CLI to generate content...');
    console.log('Model:', model);
    console.log('Prompt length:', prompt.length, 'characters');
    
    // Create a temporary file with the prompt (more reliable than command-line escaping)
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `ollama-prompt-${Date.now()}.txt`);
    
    try {
      // Write prompt to temp file
      fs.writeFileSync(tempFile, prompt, 'utf8');
      
      // Use spawn to pipe file content directly to ollama (more reliable than shell pipes)
      console.log('Platform:', process.platform);
      console.log('Using spawn to pipe file to ollama...');
      
      // Read the file content
      const fileContent = fs.readFileSync(tempFile, 'utf8');
      
      // Use spawn to run ollama and pipe stdin
      const ollamaProcess = spawn('ollama', ['run', model], {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Write the prompt to ollama's stdin
      ollamaProcess.stdin.write(fileContent);
      ollamaProcess.stdin.end();
      
      // Collect output
      let stdout = '';
      let stderr = '';
      
      ollamaProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ollamaProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
        // Wait for process to complete
        const exitCode = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            ollamaProcess.kill();
            reject(new Error('Ollama process timed out after 10 minutes'));
          }, 600000); // 10 minute timeout (increased from 5 minutes)
        
        ollamaProcess.on('close', (code) => {
          clearTimeout(timeout);
          resolve(code);
        });
        
        ollamaProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      if (exitCode !== 0 && !stdout) {
        throw new Error(`Ollama process exited with code ${exitCode}. stderr: ${stderr}`);
      }
      
      // Combine stdout and stderr
      let response = (stdout || '') + (stderr || '');
      
      // Clean up ANSI escape codes and control characters
      response = response.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
      response = response.replace(/\x1B\[[?]?[0-9;]*[hl]/g, '');
      response = response.replace(/[⠙⠹⠸⠼⠴⠦⠧⠏⠋⠇]/g, '');
      response = response.replace(/\[[0-9]*[GK]?\]/g, '');
      response = response.replace(/\[[0-9]+G/g, '');
      response = response.replace(/\?2026[hl]/g, '');
      response = response.replace(/\?25[hl]/g, '');
      response = response.replace(/\r\n/g, '\n');
      response = response.replace(/\r/g, '\n');
      
      // Remove lines that are just control characters or empty
      const lines = response.split('\n');
      const cleanedLines = lines
        .map(line => {
          // Remove ANSI codes from each line
          let cleaned = line.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
          cleaned = cleaned.replace(/[⠙⠹⠸⠼⠴⠦⠧⠏⠋⠇]/g, '');
          cleaned = cleaned.replace(/\[[0-9]*[GK]?\]/g, '');
          cleaned = cleaned.replace(/\[[0-9]+G/g, '');
          return cleaned.trim();
        })
        .filter(line => {
          // Keep lines that have actual content
          if (line.length === 0) return false;
          if (line.match(/^[⠙⠹⠸⠼⠴⠦⠧⠏⠋⠇\s]*$/)) return false;
          if (line === 'ollama :' || line.startsWith('ollama')) return false;
          if (line.match(/^\[[0-9]*[GK]?\]$/)) return false;
          return true;
        });
      
      response = cleanedLines.join('\n').trim();
      
      // If still empty, try to extract from raw output (less aggressive filtering)
      if (!response || response.length < 10) {
        console.warn('⚠️  First pass returned empty, trying less aggressive filtering...');
        // Try with just basic cleanup
        let fallbackResponse = (stdout || '') + (stderr || '');
        fallbackResponse = fallbackResponse.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
        fallbackResponse = fallbackResponse.replace(/[⠙⠹⠸⠼⠴⠦⠧⠏⠋⠇]/g, '');
        fallbackResponse = fallbackResponse.replace(/\[[0-9]*[GK]?\]/g, '');
        fallbackResponse = fallbackResponse.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 5 && !l.includes('ollama') && !l.match(/^\[[0-9]*[GK]?\]$/))
          .join('\n')
          .trim();
        
        if (fallbackResponse && fallbackResponse.length >= 10) {
          console.log('✅ Using fallback response (length:', fallbackResponse.length, ')');
          response = fallbackResponse;
        } else {
          console.error('❌ Ollama CLI returned empty response after all attempts');
          console.error('Raw stdout length:', stdout?.length || 0);
          console.error('Raw stderr length:', stderr?.length || 0);
          console.error('Raw stdout preview:', stdout?.substring(0, 1000));
          console.error('Raw stderr preview:', stderr?.substring(0, 1000));
          throw new Error('Ollama CLI returned empty or invalid response. Check if model is available: ollama list');
        }
      }
      
      console.log('✅ Ollama CLI response received (length:', response.length, 'chars)');
      console.log('Response preview (first 500 chars):', response.substring(0, 500));
      
      // If response is very short or seems empty, log warning
      if (response.length < 50) {
        console.warn('⚠️  Response seems very short. Full response:', response);
      }
      
      return response;
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (e) {
        console.warn('Could not delete temp file:', e.message);
      }
    }
  } catch (error) {
    console.error('❌ Ollama CLI error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error signal:', error.signal);
    if (error.stdout) console.error('CLI stdout preview:', error.stdout.substring(0, 500));
    if (error.stderr) console.error('CLI stderr preview:', error.stderr.substring(0, 500));
    
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      throw new Error('Ollama is not running. Please start Ollama: ollama serve');
    }
    
    if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
      throw new Error('Ollama request timed out. The model may be processing a large request. Please try again.');
    }
    
    throw new Error(
      `Ollama CLI error: ${error.message}. ` +
      `Please ensure Ollama is installed and the model "${model}" is available. ` +
      `Run: ollama pull ${model}`
    );
  }
}

/**
 * Generate website structure based on customer requirements
 * Returns: Array of page configurations with content blocks
 */
async function generateWebsiteStructure(customerDetails) {
  // Build pages list from customPages if provided
  let pagesInstruction = '';
  if (customerDetails.customPages && customerDetails.customPages.trim()) {
    const customPagesList = customerDetails.customPages.split(',').map(p => p.trim()).filter(p => p.length > 0);
    pagesInstruction = `\n\nIMPORTANT: The customer has specifically requested these pages: ${customPagesList.join(', ')}. Make sure to include ALL of these pages in your response.`;
  }
  
  // Extract key information from customer details - prioritize form values
  const familyName = customerDetails.familyName || customerDetails.siteTitle || 'Family';
  const siteTitle = customerDetails.siteTitle || familyName;
  const headerText = customerDetails.description || customerDetails.headerText || customerDetails.additionalInfo || '';
  const footerText = customerDetails.additionalInfo || customerDetails.footerText || '';
  const description = customerDetails.description || customerDetails.additionalInfo || '';
  const businessType = customerDetails.businessType || description || '';
  const services = customerDetails.services || customerDetails.customPages || '';
  const location = customerDetails.location || '';
  const theme = customerDetails.theme || 'light';
  const uploadedImageUrl = customerDetails.uploadedImageUrl || customerDetails.heroImageUrl || null;
  
  const prompt = `You are an expert web designer and developer. Create a BEAUTIFUL, MODERN, PROFESSIONAL website that looks like a REAL, LIVE website from a top design agency (worth $50,000+).

CRITICAL: This must look like a REAL, LIVE, PROFESSIONAL website - NOT a template, NOT a placeholder, NOT a basic demo. It should look like a website you'd see from companies like Apple, Stripe, or modern SaaS companies.

The website MUST have:
- Professional header with clean navigation menu (like modern websites: logo on left, nav links on right)
- STUNNING full-width hero section with background image covering the entire hero area
- Well-structured content sections with proper spacing and alignment
- Professional typography: clear hierarchy, readable fonts (Inter, system fonts), proper line spacing
- Engaging, real content that tells a compelling story
- Professional contact forms with proper fields and styling
- Clean, modern footer with links and copyright
- Smooth, working navigation with active page highlighting
- Modern design: proper colors, subtle shadows, rounded corners, smooth transitions
- Content cards/sections with icons, titles, and descriptions (like feature cards)
- Professional layout: centered content, proper margins, max-width containers

Based on these EXACT customer details from the form:

Site Title: "${siteTitle}"
Header Text: "${headerText}"
Description: "${description}"
Footer Text: "${footerText}"
Theme: ${theme}
Custom Pages Requested: ${services || 'None specified'}
${pagesInstruction}

CRITICAL REQUIREMENTS FOR A BEAUTIFUL, REAL WEBSITE:

1. DESIGN EXCELLENCE - MAKE IT LOOK REAL AND PROFESSIONAL:
   - Create a polished header with "${siteTitle}" as the brand name and clean navigation
   - Design stunning full-width hero sections with background images (never separate image elements)
   - Use professional typography: clear hierarchy, readable fonts, proper line spacing
   - Apply a cohesive color scheme (${theme} theme) throughout
   - Add generous white space and proper margins/padding
   - Include subtle shadows, rounded corners, and smooth transitions
   - Make it look like a REAL, LIVE website - not a template

2. HERO SECTION - MUST BE FULL-WIDTH WITH BACKGROUND IMAGE (LIKE REAL PROFESSIONAL WEBSITES):
   ${uploadedImageUrl ? `- CRITICAL: You MUST use the uploaded image "${uploadedImageUrl}" as the hero background image. This is the customer's uploaded image - use it EXACTLY as provided.` : ''}
   - Homepage MUST have a hero block with a large background image covering the ENTIRE hero section
   ${uploadedImageUrl ? `- Use "${uploadedImageUrl}" EXACTLY as the hero background image URL` : '- Use high-quality Unsplash images: https://images.unsplash.com/photo-[ID]?w=1400&h=700&fit=crop'}
   - Hero section should be FULL-WIDTH (100% width) and TALL (minimum 600px height, preferably 700-800px)
   - Background image must cover the entire hero area: background-size: cover; background-position: center;
   - Use "${headerText}" as the main headline (large, bold, white text, 48-64px font size)
   - Use "${description}" as the subtitle (smaller white text, 20-24px, lighter weight)
   - Include 2 call-to-action buttons: "Contact Us" (primary, blue) and "Learn More" (secondary, outlined)
   - Image must be used as CSS background-image, NOT as an <img> tag - text overlaid on top
   - Add dark overlay gradient (rgba(0,0,0,0.4) to rgba(0,0,0,0.6)) for text readability
   - Center all text and buttons horizontally and vertically in the hero
   - Make it look like a REAL professional website hero section (like Apple, Stripe, modern SaaS sites)

3. CONTENT REQUIREMENTS - REAL, ENGAGING CONTENT:
   - Site Title "${siteTitle}": Use in header, all page titles, branding
   - Header Text "${headerText}": Use in hero sections as main headline
   - Description "${description}": Create ALL content based on this
     * Write 3-4 meaningful paragraphs for text blocks
     * Make it personal, engaging, and specific to "${siteTitle}"
     * NO generic text, NO placeholders, NO "Lorem ipsum"
   - Footer Text "${footerText}": Use in footer
   - Every sentence should be meaningful and relate to "${siteTitle}" and "${description}"

4. PAGE STRUCTURE - PROFESSIONAL LAYOUT LIKE REAL WEBSITES:
   - Homepage: 
     * Hero section (full-width background with ${uploadedImageUrl ? 'uploaded image' : 'professional image'}, large title, subtitle, 2 buttons)
     * Features/Services section (3-4 cards in a row, each with icon, title, description - like modern SaaS sites)
     * About section (4-6 detailed paragraphs, well-formatted)
     * Gallery section (if images provided, grid layout with 4-6 images)
     * Testimonials section (3-4 cards with quotes, names, roles)
     * Contact CTA section
   - About page: Page title → 4-6 detailed paragraphs → Image section → Mission/Vision cards → Team/Values
   - Services page: Page title → Service cards (3-5 services, each with icon, title, 2-3 paragraphs description) → Benefits section → Call to action
   - Contact page: Page title → "Get in Touch" section (2-3 paragraphs) → Contact form (professional styling) → Map/Location → Social links
   - Gallery page: If images are provided, create a dedicated gallery page with grid layout (like photography portfolios)
   - Each page should feel complete, professional, and look like a REAL website with proper sections, cards, and content blocks

5. CONTENT BLOCKS - DETAILED REQUIREMENTS:
   - Hero blocks: ${uploadedImageUrl ? `Use "${uploadedImageUrl}" as background image` : 'Use high-quality Unsplash image'} + "${headerText}" as title + "${description}" as subtitle + 2 buttons
   - Text blocks: Write 4-6 REAL, DETAILED paragraphs (not 2-3) about "${siteTitle}" based on "${description}"
     * First paragraph: Compelling introduction about "${siteTitle}" and what makes it special
     * Middle paragraphs (2-4 paragraphs): Provide extensive details, services, story, values, mission based on "${description}"
     * Last paragraph: Strong call to action or conclusion
     * Each paragraph should be 3-5 sentences with real, meaningful content
   - Form blocks: Create proper contact forms with fields (name, email, phone, message) - professional styling
   - Image blocks: Use relevant Unsplash images that match "${description}"
   ${uploadedImageUrl ? `- Gallery blocks: If multiple images are provided, create a "Family Gallery" section with the uploaded image(s). Include 4-6 additional professional Unsplash images related to "${siteTitle}" to create a rich gallery.` : '- Gallery blocks: Include 6-8 professional images related to "${siteTitle}"'}
   - Stats/Features: Create 4-6 realistic features or statistics with icons and descriptions
   - Testimonials: Write 3-4 authentic-sounding testimonials with names and roles
   - Services/Products: If applicable, create detailed service/product sections with descriptions

6. PROFESSIONAL POLISH - MAKE IT LOOK LIKE A REAL, LIVE WEBSITE:
   - Proper spacing: 80-100px between major sections, 60px between subsections, 40px between cards
   - Readable text: 16-18px body text, proper line height (1.6-1.8), max-width 1200px for content (centered)
   - Professional colors: Use the ${theme} theme consistently, with accent colors (blue for primary, gray for secondary)
   - Working navigation: All links must work, active page highlighting, smooth hover effects
   - Contact forms: Professional styling - white background, rounded inputs, proper labels, blue submit button
   - Footer: Clean footer with "${footerText}", copyright, navigation links, social icons (if applicable)
   - Alignment: 
     * Headers: Centered, large (42-48px), bold
     * Body text: Left-aligned in max-width container (centered on page)
     * Cards: Grid layout, evenly spaced, centered
     * CTAs: Centered
   - Grid layouts: Use CSS grid (3-4 columns on desktop, responsive) for galleries, features, testimonials
   - Cards/Sections: White/light background, subtle shadow (0 4px 6px rgba(0,0,0,0.1)), rounded corners (8-12px), padding (24-32px)
   - Icons: Use simple, clean icons (can be emoji or Unicode symbols) for features/services
   - Responsive: Mobile-first, breakpoints at 768px and 1024px
   - Overall: Should look EXACTLY like a real, professional website - like you'd see from modern companies (Apple, Stripe, Notion, etc.)

Generate JSON with this structure:
{
  "pages": [
    {
      "pageType": "homepage",
      "pageTitle": "${familyName} - Home",
      "pageSlug": "home",
      "routePath": "/",
      "contentBlocks": [
        {
          "blockType": "hero",
          "contentData": {
            "title": "${headerText || siteTitle}",
            "subtitle": "${description || 'Welcome to ' + siteTitle}",
            "image": "${uploadedImageUrl ? uploadedImageUrl : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1400&h=700&fit=crop'}",
            "imageUrl": "${uploadedImageUrl ? uploadedImageUrl : ''}",
            "button1Text": "Contact Us",
            "button1Link": "/contact",
            "button2Text": "Learn More",
            "button2Link": "/about"
          }
        },
        {
          "blockType": "stats",
          "contentData": {
            "title": "Why Choose ${siteTitle}",
            "stats": [
              {"value": "100+", "label": "Happy Clients"},
              {"value": "5+", "label": "Years Experience"},
              {"value": "24/7", "label": "Support"},
              {"value": "99%", "label": "Satisfaction Rate"}
            ]
          }
        },
        {
          "blockType": "text",
          "contentData": {
            "heading": "About ${siteTitle}",
            "body": "Write 4-6 DETAILED, engaging, real paragraphs (not 2-3) based on: '${description}'. First paragraph: Compelling introduction about ${siteTitle} and what makes it special. Middle paragraphs (2-4 paragraphs): Provide extensive details, services, story, values, mission, history based on '${description}'. Each paragraph should be 3-5 sentences with real, meaningful content. Last paragraph: Strong call to action or conclusion. Use '${siteTitle}' naturally throughout. NO placeholder text, NO generic content. Make it feel like a real, professional website with substantial content."
          }
        },
        {
          "blockType": "gallery",
          "contentData": {
            "title": "${uploadedImageUrl ? 'Family Gallery' : 'Our Gallery'}",
            "images": [
              ${uploadedImageUrl ? `{"url": "${uploadedImageUrl}", "alt": "${siteTitle} - Family Photo"},` : ''}
              {"url": "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=800&h=600&fit=crop", "alt": "${siteTitle}"},
              {"url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=600&fit=crop", "alt": "${siteTitle}"},
              {"url": "https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=800&h=600&fit=crop", "alt": "${siteTitle}"},
              {"url": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&h=600&fit=crop", "alt": "${siteTitle}"},
              {"url": "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&h=600&fit=crop", "alt": "${siteTitle}"}
            ]
          }
        }
      ]
    }
    ${pagesInstruction ? `,{
      "pageType": "about",
      "pageTitle": "About Us",
      "pageSlug": "about",
      "routePath": "/about",
      "contentBlocks": [
        {
          "blockType": "text",
          "contentData": {
            "heading": "Our Story",
            "body": "Write 3-4 real, engaging paragraphs about ${siteTitle}'s story, mission, and values based on: '${description}'. Make it personal and compelling. NO placeholder text."
          }
        },
        {
          "blockType": "form",
          "contentData": {
            "title": "Contact Us",
            "description": "If you need any help or just want to say hello, please don't hesitate to reach out. You can contact us via phone, email, or by filling out the form below.",
            "submitText": "Send Message"
          }
        }
      ]
    }` : ''}
  ],
  "websiteConfig": {
    "siteTitle": "${siteTitle}",
    "headerText": "${headerText || 'Welcome to ' + siteTitle}",
    "footerText": "${footerText || '© ' + new Date().getFullYear() + ' ' + siteTitle + '. All rights reserved.'}",
    "theme": "${theme}"
  }
}

CRITICAL RULES - FOLLOW EXACTLY:
- Use the EXACT Site Title: "${siteTitle}" everywhere
- Use the Header Text "${headerText}" prominently in hero sections
- Use the Description "${description}" to create all content
- Use the Footer Text "${footerText}" in the footer
- Write REAL, engaging content - NO placeholders, NO "Lorem ipsum", NO generic text
- Make it BEAUTIFUL and PROFESSIONAL - like a $10,000 website
- Every piece of content should be personalized and relevant to "${siteTitle}" and "${description}"
- Use modern design principles: beautiful typography, proper spacing, engaging visuals

CRITICAL HERO SECTION RULE:
${uploadedImageUrl ? `- The hero section MUST use "${uploadedImageUrl}" as a CSS background-image
- The image MUST cover the entire hero section (background-size: cover)
- Text MUST be overlaid on top of the image (white text with shadow)
- DO NOT create a separate image block - the image is ONLY a background
- The hero section should be full-width and tall (700px+ height)
- Add a dark overlay (rgba(0,0,0,0.5)) so text is readable over the image` : ''}

MOST IMPORTANT: You MUST return ONLY valid JSON. 
- Start your response with { and end with }
- Do NOT include any explanatory text before or after the JSON
- Do NOT wrap the JSON in markdown code blocks
- Do NOT include any text like "Here is the JSON:" or similar
- Return ONLY the JSON object, nothing else`;

  try {
    const response = await callOllama(prompt);
    
    console.log('📥 Raw Ollama response length:', response.length);
    console.log('📥 Raw Ollama response preview (first 1000 chars):', response.substring(0, 1000));
    
    // Extract JSON from response (Ollama might add extra text)
    // First, try to find JSON wrapped in markdown code blocks
    let jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    
    if (!jsonMatch) {
      // Try to find any JSON object in the response
      jsonMatch = response.match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      // Try to find JSON that might start after some text
      const braceIndex = response.indexOf('{');
      if (braceIndex !== -1) {
        // Find the matching closing brace
        let braceCount = 0;
        let endIndex = braceIndex;
        for (let i = braceIndex; i < response.length; i++) {
          if (response[i] === '{') braceCount++;
          if (response[i] === '}') braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
        if (endIndex > braceIndex) {
          jsonMatch = [response.substring(braceIndex, endIndex)];
        }
      }
    }
    
    if (!jsonMatch) {
      console.error('❌ No JSON found in Ollama response');
      console.error('Full response:', response);
      console.error('Response length:', response.length);
      throw new Error('Invalid JSON response from Ollama: No JSON object found. The AI may not have generated JSON. Please try again.');
    }
    
    let jsonString = jsonMatch[0];
    
    // Clean up common JSON issues
    // Remove trailing commas before closing braces/brackets
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Try to fix unclosed brackets (add closing if needed)
    const openBraces = (jsonString.match(/\{/g) || []).length;
    const closeBraces = (jsonString.match(/\}/g) || []).length;
    const openBrackets = (jsonString.match(/\[/g) || []).length;
    const closeBrackets = (jsonString.match(/\]/g) || []).length;
    
    if (openBraces > closeBraces) {
      jsonString += '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      jsonString += ']'.repeat(openBrackets - closeBrackets);
    }
    
    // Remove any text after the last closing brace
    const lastBraceIndex = jsonString.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      jsonString = jsonString.substring(0, lastBraceIndex + 1);
    }
    
    // Try to parse the cleaned JSON
    let websiteStructure;
    try {
      websiteStructure = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('Cleaned JSON preview:', jsonString.substring(0, 500));
      console.error('Original response preview:', response.substring(0, 500));
      
      // Try one more time with more aggressive cleaning
      try {
        // Remove any non-printable characters except newlines and tabs
        let cleanedJson = jsonString.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
        // Remove any text that looks like it's outside JSON structure
        cleanedJson = cleanedJson.replace(/^[^{]*/, ''); // Remove text before first {
        cleanedJson = cleanedJson.replace(/[^}]*$/, ''); // Remove text after last }
        cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        
        websiteStructure = JSON.parse(cleanedJson);
        console.log('✅ Successfully parsed after aggressive cleaning');
      } catch (secondParseError) {
        console.error('❌ Second parse attempt also failed:', secondParseError.message);
        throw new Error(`Invalid JSON response from Ollama: ${parseError.message}. Response preview: ${jsonString.substring(0, 200)}`);
      }
    }
    
    return websiteStructure;
  } catch (error) {
    console.error('Error generating website structure:', error);
    throw error;
  }
}

/**
 * Generate content for a specific page
 */
async function generatePageContent(pageType, pageTitle, customerDetails) {
  const prompt = `Generate content for a ${pageType} page titled "${pageTitle}" for a family portal website.

Customer Details:
${JSON.stringify(customerDetails, null, 2)}

Generate content blocks in JSON format:
{
  "contentBlocks": [
    {
      "blockType": "hero|text|image|gallery|form|video|map|timeline|testimonial|stats",
      "contentData": {
        // Content specific to block type
      }
    }
  ]
}

For text blocks, provide engaging, family-friendly content. For hero blocks, provide welcoming titles and subtitles.
CRITICAL: You MUST return ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Return ONLY the JSON object starting with { and ending with }.`;

  try {
    const response = await callOllama(prompt);
    
    // Extract JSON from response
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonMatch = [codeBlockMatch[1]];
      }
    }
    
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Ollama: No JSON object found');
    }
    
    let jsonString = jsonMatch[0];
    // Clean up common JSON issues
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    const pageContent = JSON.parse(jsonString);
    return pageContent;
  } catch (error) {
    console.error('Error generating page content:', error);
    throw error;
  }
}

/**
 * Generate text content for a content block
 */
async function generateTextContent(topic, context = '') {
  const prompt = `Write engaging, family-friendly content about: ${topic}

Context: ${context}

Provide a heading and body text in JSON format:
{
  "heading": "Heading text",
  "body": "Body text (2-3 paragraphs)"
}

CRITICAL: You MUST return ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Return ONLY the JSON object starting with { and ending with }.`;

  try {
    const response = await callOllama(prompt);
    
    // Extract JSON from response
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonMatch = [codeBlockMatch[1]];
      }
    }
    
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Ollama: No JSON object found');
    }
    
    let jsonString = jsonMatch[0];
    // Clean up common JSON issues
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    const textContent = JSON.parse(jsonString);
    return textContent;
  } catch (error) {
    console.error('Error generating text content:', error);
    throw error;
  }
}

/**
 * Check if Ollama is running
 */
async function checkOllamaStatus() {
  if (!OLLAMA_API_URL) {
    return {
      running: false,
      error: 'OLLAMA_API_URL not configured. Please set OLLAMA_API_URL environment variable.'
    };
  }
  
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/api/tags`, {
      timeout: 5000
    });
    return {
      running: true,
      models: response.data.models || []
    };
  } catch (error) {
    return {
      running: false,
      error: error.message
    };
  }
}

module.exports = {
  callOllama,
  generateWebsiteStructure,
  generatePageContent,
  generateTextContent,
  checkOllamaStatus,
  OLLAMA_API_URL,
  OLLAMA_MODEL
};
