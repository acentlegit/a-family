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

// Ollama API endpoint (default: http://localhost:11434)
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'; // or 'mistral', 'codellama', etc.

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
          reject(new Error('Ollama process timed out after 5 minutes'));
        }, 300000); // 5 minute timeout
        
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
  
  // Extract key information from customer details
  const familyName = customerDetails.familyName || customerDetails.siteTitle || 'Family';
  const businessType = customerDetails.businessType || customerDetails.description || '';
  const services = customerDetails.services || customerDetails.customPages || '';
  const location = customerDetails.location || '';
  const description = customerDetails.description || customerDetails.additionalInfo || '';
  
  const prompt = `You are a professional website generator. Create a complete, real website for a family portal based on these customer details:

Family/Business Name: ${familyName}
Business Type/Description: ${businessType}
Services/Pages: ${services}
Location: ${location}
Additional Details: ${description}
${pagesInstruction}

Generate a REAL, PROFESSIONAL website with actual content (NOT placeholder text like "Lorem ipsum" or "Main heading"). 

Requirements:
1. Use the family/business name throughout the website
2. Create engaging, real content based on the business type and description
3. For hero sections, write compelling headlines and descriptions that match the business
4. For text blocks, write 2-3 paragraphs of meaningful content about the business/family
5. Use professional Unsplash image URLs that match the theme (e.g., family photos, business images, etc.)
6. Make buttons and links functional and relevant
7. NO placeholder text, NO "Lorem ipsum", NO generic placeholders like "Main heading" or "Supporting description text"

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
            "title": "A compelling headline about ${familyName}",
            "subtitle": "A real description of what ${familyName} offers or represents",
            "image": "https://images.unsplash.com/photo-[relevant-image-id]",
            "button1Text": "Get Started",
            "button1Link": "/contact",
            "button2Text": "Learn More",
            "button2Link": "/about"
          }
        },
        {
          "blockType": "text",
          "contentData": {
            "heading": "About ${familyName}",
            "body": "Write 2-3 real paragraphs about ${familyName} based on: ${businessType}. ${description}"
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
            "body": "Write real content about ${familyName}'s story, mission, and values based on: ${description}"
          }
        }
      ]
    }` : ''}
  ],
  "websiteConfig": {
    "siteTitle": "${familyName}",
    "headerText": "Welcome to ${familyName}",
    "footerText": "© ${new Date().getFullYear()} ${familyName}. All rights reserved.",
    "theme": "${customerDetails.theme || 'light'}"
  }
}

CRITICAL RULES:
- Write REAL content, not placeholders
- Use the actual family/business name: ${familyName}
- Base content on: ${businessType} ${description}
- NO "Lorem ipsum", NO "Main heading", NO generic placeholders
- Make it professional and engaging

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
