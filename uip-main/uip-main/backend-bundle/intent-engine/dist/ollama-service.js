"use strict";
// Ollama Service - Integrates with Ollama LLM for natural language processing
// Default Ollama endpoint: http://localhost:11434
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEngineResponse = generateEngineResponse;
exports.generateSummaryDetails = generateSummaryDetails;
exports.generateActionItems = generateActionItems;
exports.callOllama = callOllama;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const intent_library_loader_1 = require("./intent-library-loader");
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || 'llama3.2:1b').trim(); // Use llama3.2:1b (already available), llama3.2, mistral, or any available model
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '30000', 10);
const DEFAULT_LIBRARY_FILENAME = 'Intent_Library_Ollama_Enterprise_Ready.xlsx';
const DEFAULT_LIBRARY_JSON = 'Intent_Library_Ollama_Enterprise_Ready.json';
const ENV_LIBRARY_PATH = process.env.INTENT_LIBRARY_PATH;
const DEFAULT_LIBRARY_PATH = path.resolve(process.cwd(), DEFAULT_LIBRARY_FILENAME);
const DEFAULT_LIBRARY_JSON_PATH = path.resolve(process.cwd(), DEFAULT_LIBRARY_JSON);
const INTENT_LIBRARY_PATH = ENV_LIBRARY_PATH
    || (fs.existsSync(DEFAULT_LIBRARY_PATH)
        ? DEFAULT_LIBRARY_PATH
        : (fs.existsSync(DEFAULT_LIBRARY_JSON_PATH)
            ? DEFAULT_LIBRARY_JSON_PATH
            : DEFAULT_LIBRARY_PATH));
const OLLAMA_ONLY = process.env.OLLAMA_ONLY !== 'false';
function normalizeLibraryModel(model) {
    const lower = model.toLowerCase();
    if (lower.includes('llama3'))
        return 'llama3';
    if (lower.includes('mistral'))
        return 'mistral';
    if (lower.includes('codellama') || lower.includes('code-llama'))
        return 'codellama';
    return 'llama3';
}
/**
 * Extract intent name from user intent text based on sheet structure
 * Examples: "Strategic planning", "Decision making", "Code generation", etc.
 */
function extractIntentName(intentText, engineName) {
    const lowerIntent = intentText.toLowerCase();
    // Map common intent patterns to sheet intent names
    const intentPatterns = {
        // Executive & Strategy intents
        'Strategic planning': ['strategic plan', 'strategy', 'planning', 'roadmap'],
        'Decision making': ['decision', 'decide', 'choose', 'select'],
        'Scenario analysis': ['scenario', 'analysis', 'what if', 'simulate'],
        'Trade-off evaluation': ['trade-off', 'tradeoff', 'trade off', 'evaluate trade'],
        'Vision articulation': ['vision', 'articulate', 'define vision'],
        'Goal setting (OKRs)': ['goal', 'okr', 'objective', 'key result', 'target'],
        'Market entry analysis': ['market entry', 'enter market', 'market analysis'],
        'Portfolio prioritization': ['portfolio', 'prioritize', 'priority'],
        'Risk assessment': ['risk', 'assess risk', 'risk analysis'],
        'Executive briefing': ['briefing', 'brief', 'executive'],
        // Product Management intents
        'User research synthesis': ['user research', 'research', 'user study'],
        'Requirements definition': ['requirement', 'requirements', 'define requirement'],
        'Feature ideation': ['feature', 'ideate', 'idea', 'concept'],
        'Roadmap planning': ['roadmap', 'product roadmap'],
        'Prioritization': ['prioritize', 'priority', 'prioritization'],
        'Launch planning': ['launch', 'launch plan'],
        'Post-launch analysis': ['post launch', 'after launch', 'post-launch'],
        'Stakeholder alignment': ['stakeholder', 'align', 'alignment'],
        'Product documentation': ['documentation', 'document', 'docs'],
        // Engineering & Technical intents
        'Code generation': ['generate code', 'write code', 'create code', 'code'],
        'Code refactoring': ['refactor', 'refactoring', 'restructure code'],
        'Code review': ['review code', 'code review', 'review'],
        'Debugging': ['debug', 'debugging', 'fix bug', 'troubleshoot'],
        'RAG App v2 Documentation': [
            'rag app v2',
            'rag app',
            'rag documentation',
            'retrieval augmented generation',
            'pgvector',
            'semantic chunking',
            'vector database',
            'fastapi rag',
            'celery rag'
        ]
    };
    // Check for matching intent patterns
    for (const [intentName, patterns] of Object.entries(intentPatterns)) {
        for (const pattern of patterns) {
            if (lowerIntent.includes(pattern)) {
                return intentName;
            }
        }
    }
    // Engine-specific fallbacks
    const engineIntentMap = {
        'compliance': 'Risk assessment',
        'policy': 'Requirements definition',
        'risk': 'Risk assessment',
        'explainability': 'Decision making',
        'routing': 'Code generation',
        'integration': 'Code generation',
        'versioning': 'Code refactoring',
        'ai': 'Feature ideation',
        'pricing': 'Prioritization',
        'quota': 'Requirements definition',
        'learning': 'User research synthesis',
        'code': 'Code generation',
        'debugging': 'Debugging'
    };
    if (engineIntentMap[engineName]) {
        return engineIntentMap[engineName];
    }
    // Default: use first few words of intent as intent name
    const words = intentText.trim().split(/\s+/).slice(0, 3);
    return words.join(' ').charAt(0).toUpperCase() + words.join(' ').slice(1);
}
/**
 * Map engine/industry/intent to category based on sheet structure
 */
function getCategoryForEngine(engineName, intentText, industry) {
    // First, try to determine category from intent text
    if (intentText) {
        const lowerIntent = intentText.toLowerCase();
        // Executive & Strategy intents
        const executiveIntents = [
            'strategic', 'decision', 'scenario', 'trade-off', 'vision', 'goal', 'okr',
            'market entry', 'portfolio', 'risk assess', 'executive brief', 'planning',
            'compliance', 'policy'
        ];
        // Product Management intents
        const productIntents = [
            'user research', 'requirement', 'feature', 'roadmap', 'prioritiz', 'launch',
            'stakeholder', 'documentation', 'product', 'pricing', 'quota'
        ];
        // Engineering & Technical intents
        const engineeringIntents = [
            'code generation', 'refactor', 'code review', 'debug', 'routing', 'integration',
            'versioning', 'code', 'technical', 'engineering', 'rag', 'pgvector',
            'vector database', 'embeddings', 'semantic chunking'
        ];
        if (executiveIntents.some(pattern => lowerIntent.includes(pattern))) {
            return 'Executive & Strategy';
        }
        if (productIntents.some(pattern => lowerIntent.includes(pattern))) {
            return 'Product Management';
        }
        if (engineeringIntents.some(pattern => lowerIntent.includes(pattern))) {
            return 'Engineering & Technical';
        }
    }
    // Map engines to categories based on the sheet structure
    const engineCategoryMap = {
        'compliance': 'Executive & Strategy',
        'policy': 'Executive & Strategy',
        'risk': 'Executive & Strategy',
        'explainability': 'Executive & Strategy',
        'routing': 'Engineering & Technical',
        'integration': 'Engineering & Technical',
        'versioning': 'Engineering & Technical',
        'code': 'Engineering & Technical',
        'debugging': 'Engineering & Technical',
        'ai': 'Product Management',
        'pricing': 'Product Management',
        'quota': 'Product Management',
        'learning': 'Product Management'
    };
    // If engine has a specific category, use it
    if (engineCategoryMap[engineName]) {
        return engineCategoryMap[engineName];
    }
    // Map industries to categories as fallback
    const industryCategoryMap = {
        'real-estate': 'Executive & Strategy',
        'finance': 'Executive & Strategy',
        'automobile': 'Product Management',
        'healthcare': 'Executive & Strategy',
        'manufacturing': 'Product Management',
        'retail': 'Product Management',
        'education': 'Executive & Strategy',
        'communications': 'Engineering & Technical'
    };
    if (industry && industryCategoryMap[industry]) {
        return industryCategoryMap[industry];
    }
    // Default category
    return 'Executive & Strategy';
}
/**
 * Get model-specific system prompt based on sheet structure
 */
function getModelSpecificPrompt(model, category) {
    const modelLower = model.toLowerCase();
    if (modelLower.includes('llama3') || modelLower.includes('llama-3')) {
        return `You are a senior ${category} expert. Be precise, structured, and practical.`;
    }
    if (modelLower.includes('mistral')) {
        return `You are a concise assistant optimized for instruction-following and speed.`;
    }
    if (modelLower.includes('codellama') || modelLower.includes('code-llama')) {
        return `You are a coding-focused assistant. Prefer explicit logic and clear structure.`;
    }
    // Default for other models (including llama3.2:1b)
    return `You are a senior ${category} expert. Be precise, structured, and practical.`;
}
/**
 * Build system prompt according to exact sheet structure
 */
function buildSystemPrompt(category, intent, model) {
    // Base system prompt from sheet (Ollama Prompt Template)
    const basePrompt = `System: You are an expert assistant specialized in ${category}.
User Intent: ${intent}.
Task: Generate accurate, structured, and actionable output for this intent.
Constraints: Be concise, avoid assumptions, state uncertainties, and format the response in clear bullet points or tables where appropriate.`;
    // Model-specific prompt from sheet
    const modelSpecificPrompt = getModelSpecificPrompt(model, category);
    // Developer prompt from sheet
    const developerPrompt = `Follow internal standards. Do not hallucinate. Ask for clarification if required context is missing.`;
    // Combine all prompts according to sheet structure
    return `${basePrompt}

${modelSpecificPrompt}

${developerPrompt}`;
}
/**
 * Build user prompt according to sheet structure
 */
function buildUserPrompt(intent, context) {
    const contextStr = context ? ` Context: ${context}` : '';
    return `Intent: ${intent}${contextStr} Produce output strictly matching the JSON schema.`;
}
function buildLibraryPrompt(intentName, context) {
    try {
        return (0, intent_library_loader_1.buildPrompt)(INTENT_LIBRARY_PATH, intentName, normalizeLibraryModel(OLLAMA_MODEL), context);
    }
    catch (error) {
        console.warn(`[IntentLibrary] ${error.message}`);
        return null;
    }
}
/**
 * Call Ollama API to generate response
 */
async function callOllama(prompt, systemPrompt, category, intent) {
    try {
        const startTime = Date.now();
        // Build system prompt according to sheet structure if category and intent provided
        let finalSystemPrompt = systemPrompt;
        if (category && intent && !systemPrompt) {
            finalSystemPrompt = buildSystemPrompt(category, intent, OLLAMA_MODEL);
        }
        else if (!systemPrompt) {
            // Fallback to default system prompt
            finalSystemPrompt = `You are an INTENT-GOVERNANCE AI running inside an application.

Your role is NOT execution.
Your role is analysis, validation, explanation, and guidance.

DEFINITION:
An INTENT is a clearly stated request to do something, before doing it.
Intent = request, not execution.

CORE RULES (NON-NEGOTIABLE):
- You MUST NOT execute actions
- You MUST NOT submit forms, approve, purchase, or transfer
- You MUST NOT assume evidence exists unless explicitly provided
- You MUST always explain WHY a decision is made
- You MUST guide the user with clear next steps and official hyperlinks

STRICT BEHAVIOR CONSTRAINTS:
- NEVER fabricate documents, approvals, or eligibility
- NEVER guess timelines or success probabilities without clear basis
- ALWAYS prefer government or authoritative sources
- If the intent is not currently possible, say so clearly
- If future success is possible, guide step-by-step

TONE REQUIREMENTS:
Professional. Neutral. Clear. Human-readable.
No marketing language. No assumptions.

Provide ONLY valid JSON with real, specific values. NO placeholders, NO hardcoded examples. Analyze the actual intent provided and generate relevant, specific information.`;
        }
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                system: finalSystemPrompt,
                stream: false,
                options: {
                    temperature: 0.1,
                    top_p: 0.6,
                    num_predict: 300,
                    num_ctx: 4096,
                    repeat_penalty: 1.1,
                    top_k: 20
                }
            }),
            signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Ollama] ❌ API returned ${response.status}: ${errorText}`);
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const elapsed = Date.now() - startTime;
        if (elapsed > 3000) {
            console.log(`[Ollama] ⚠️ Slow response: ${elapsed}ms`);
        }
        if (!data.response || data.response.trim().length === 0) {
            console.error(`[Ollama] ❌ Empty response from Ollama`);
            return '';
        }
        return data.response.trim();
    }
    catch (error) {
        console.error(`[Ollama] ❌ Error: ${error.message}`);
        if (error.stack) {
            console.error(`[Ollama] Stack: ${error.stack}`);
        }
        // Return fallback response if Ollama is unavailable
        return '';
    }
}
/**
 * Generate detailed response for a specific engine based on natural language intent
 */
async function generateEngineResponse(engineName, intentText, industry, payload, engineResult) {
    console.log(`[Ollama] ========================================`);
    console.log(`[Ollama] Generating response for ${engineName} engine`);
    console.log(`[Ollama] Intent: ${intentText.substring(0, 100)}...`);
    console.log(`[Ollama] Industry: ${industry}`);
    console.log(`[Ollama] ========================================`);
    // Extract intent name from intent text based on sheet structure
    const intentName = extractIntentName(intentText, engineName);
    console.log(`[Ollama] Extracted Intent Name: ${intentName}`);
    // Get category for this engine (considering intent text)
    const category = getCategoryForEngine(engineName, intentText, industry);
    console.log(`[Ollama] Category: ${category}`);
    // Build context string from payload and raw intent text
    const payloadSnippet = payload ? JSON.stringify(payload).substring(0, 500) : '';
    const contextParts = [`User intent: ${intentText}`];
    if (payloadSnippet) {
        contextParts.push(`Payload: ${payloadSnippet}`);
    }
    const context = contextParts.join(' | ');
    // Build prompt from intent library (preferred). Fall back to local prompt builder if missing.
    const libraryPrompt = OLLAMA_ONLY ? null : buildLibraryPrompt(intentName, context);
    const fallbackPrompt = buildUserPrompt(intentText, context);
    const promptPrefix = libraryPrompt || fallbackPrompt;
    // If we already used the library prompt (which includes SYSTEM/DEVELOPER/USER),
    // avoid adding a second system prompt in callOllama.
    const systemPromptOverride = libraryPrompt ? ' ' : undefined;
    // Build engine-specific task prompts with JSON schema according to sheet structure
    // All engines use the standard schema: {"summary": "string", "details": "array", "risks": "array", "next_steps": "array"}
    const enginePrompts = {
        compliance: `${promptPrefix}

Analyze compliance for this intent. Return ONLY valid JSON matching this schema:
{
  "summary": "string",
  "details": "array",
  "risks": "array",
  "next_steps": "array"
}

Additional fields (merge with schema):
{
  "decision": "ALLOW" or "DENY" (default to ALLOW unless clear violation),
  "reason": "Plain text explanation (can be same as summary)",
  "requirements": ["Requirement 1", "Requirement 2"] (can be same as details),
  "authority": "Official authority/regulation name"
}

Return JSON only.`,
        policy: `${promptPrefix}

Analyze policies for this intent. Return ONLY valid JSON matching this schema:
{
  "summary": "string",
  "details": "array",
  "risks": "array",
  "next_steps": "array"
}

Additional fields (merge with schema):
{
  "decision": "ALLOW" or "DENY" (default to ALLOW unless policy violation),
  "reason": "Policy analysis explanation (can be same as summary)",
  "policies": ["Policy Name 1", "Policy Name 2"] (can be same as details),
  "requiredRoles": ["Role 1"] (if applicable),
  "authority": "Official authority/agency name"
}

Return JSON only.`,
        risk: `${promptPrefix}

Assess risks for this intent. Return ONLY valid JSON matching this schema:
{
  "summary": "string",
  "details": "array",
  "risks": "array",
  "next_steps": "array"
}

Additional fields (merge with schema):
{
  "riskLevel": "LOW" or "MEDIUM" or "HIGH",
  "riskScore": Number 0-100,
  "factors": ["Risk factor 1", "Risk factor 2"] (can be same as details),
  "decision": "ALLOW" or "DENY" (based on risk assessment)
}

Return JSON only.`,
        explainability: `${promptPrefix}

Explain the decision for this intent. Return ONLY valid JSON matching this schema:
{
  "summary": "string",
  "details": "array",
  "risks": "array",
  "next_steps": "array"
}

Additional fields (merge with schema):
{
  "why": "Plain text paragraph explaining WHY (can be same as summary, NO JSON structures)",
  "factors": ["Factor 1", "Factor 2"] (can be same as details),
  "nextSteps": ["Step 1", "Step 2"] (can be same as next_steps)
}

Return JSON only. The summary/why field must be plain readable text, NO JSON structures.`,
        evidence: `${promptPrefix}

ENGINE TASK:
Analyze THIS SPECIFIC INTENT and list ONLY the documents actually needed. Return ONLY valid JSON (no text before/after):
{
  "records": [{"name": "Document 1"}, {"name": "Document 2"}]
}

CRITICAL REQUIREMENTS:
- Analyze the FULL intent: "${intentText}"
- If intent says "I don't have insurance" or "no insurance", do NOT include "Insurance card" in the list
- Documents must be SPECIFIC to this intent (e.g., if dentist/healthcare: "Photo ID", "Payment method", "Medical history form" - NOT insurance card if user said no insurance)
- Return ONLY the JSON object, no explanations
- Be specific to what the user actually needs`,
        identity: `${promptPrefix}

ENGINE TASK:
Analyze identity. Be permissive - default to authenticated: true unless there are clear authentication failures. Return JSON:
- authenticated: true (default) or false (only if authentication clearly failed)
- actorId: Actual actor ID
- trustLevel: "LOW", "MEDIUM", or "HIGH"
- requiredCredentials: Array of actual credential types
- verificationMethods: Array of actual verification methods

Default to authenticated: true unless there's a clear reason to deny.

Return JSON only.`,
        routing: `${promptPrefix}

ENGINE TASK:
Determine actual execution route. Return JSON only with real paths and services.`,
        integration: `${promptPrefix}

ENGINE TASK:
Identify actual external systems needed. Return JSON only with real system names.`,
        pricing: `${promptPrefix}

ENGINE TASK:
Calculate pricing with actual costs and fees. Provide specific amounts, not placeholders. Return JSON:
- amount: Actual transaction amount (number)
- currency: Currency code (e.g., "USD", "EUR")
- fees: Array of fee objects with type and amount (e.g., [{"type": "Transfer Fee", "amount": 25.00}])
- pricingModel: Actual pricing model name (e.g., "Fixed Rate", "Tiered Pricing")
- paymentTerms: Array of payment term strings (e.g., ["Net 30", "Payment on delivery"])
- totalCost: Total cost including all fees (number)

Example: For "${intentText}" in ${industry}, calculate real transaction costs, fees, and total.

Return JSON only with all fields specified.`,
        quota: `${promptPrefix}

ENGINE TASK:
Analyze actual quota limits. Return JSON only with real numbers.`,
        versioning: `${promptPrefix}

ENGINE TASK:
Check actual version compatibility. Return JSON only with real version numbers.`,
        change: `${promptPrefix}

ENGINE TASK:
Analyze change governance with real change type and impact. Return JSON only with actual values, not placeholders. Include changeType, impactLevel, status, and changeId.`,
        ai: `${promptPrefix}

ENGINE TASK:
Provide real AI insights and practical advice. Return JSON only with actual recommendations and insights, not placeholders. Include advisory field with real advice.`,
        simulation: `${promptPrefix}

ENGINE TASK:
Run simulation with real scenarios. Return JSON only with actual scenario descriptions and outcomes, not placeholders. Include scenarios array with real descriptions.`,
        appeals: `${promptPrefix}

ENGINE TASK:
Analyze appeals eligibility and process. Provide specific steps and documentation. Return JSON:
- eligible: true or false (whether case is eligible for appeal)
- process: Array of process step strings (e.g., ["Submit appeal form", "Provide documentation", "Review by board"])
- requiredDocs: Array of document objects with type (e.g., [{"type": "Supporting Evidence"}, {"type": "Appeal Form"}])
- timelines: Object with timeframe info (e.g., {"initialAppeal": "1-2 days", "review": "5-7 business days", "decision": "10-14 days"})
- successProbability: Number between 0 and 1 (e.g., 0.75 for 75% chance)

Example: For "${intentText}" in ${industry}, determine if appeals are eligible and what the process involves.

Return JSON only with all fields specified.`,
        learning: `${promptPrefix}

ENGINE TASK:
Provide real learning insights. Return JSON only with actual patterns and optimizations.`,
        tenancy: `${promptPrefix}

ENGINE TASK:
Analyze tenancy with real boundaries. Return JSON only with actual tenant information.`
    };
    const prompt = enginePrompts[engineName];
    if (!prompt) {
        // Default prompt for engines not explicitly defined - using standard schema from sheet
        const defaultPrompt = `${promptPrefix}

Analyze this intent and return ONLY valid JSON matching this schema:
{
  "summary": "string",
  "details": "array",
  "risks": "array",
  "next_steps": "array"
}

Return JSON only.`;
        try {
            const response = await callOllama(defaultPrompt, systemPromptOverride, category, intentName);
            return processOllamaResponse(response, engineName, intentText, industry, engineResult);
        }
        catch (error) {
            console.warn(`Ollama processing failed for ${engineName}: ${error.message}`);
            return OLLAMA_ONLY
                ? { ollamaEnhanced: false, ollamaRequired: true, _ollamaError: true }
                : engineResult;
        }
    }
    try {
        // Call Ollama with category and intent for proper system prompt generation
        const response = await callOllama(prompt, systemPromptOverride, category, intentName);
        return processOllamaResponse(response, engineName, intentText, industry, engineResult, category, intentName);
    }
    catch (error) {
        console.warn(`Ollama processing failed for ${engineName}: ${error.message}`);
        return OLLAMA_ONLY
            ? { ollamaEnhanced: false, ollamaRequired: true, _ollamaError: true }
            : engineResult; // Return original on error
    }
    /**
     * Process Ollama response and transform to match sheet JSON schema
     */
    function processOllamaResponse(response, engineName, intentText, industry, engineResult, category, intentName) {
        if (!response || response.trim().length === 0) {
            console.warn(`[Ollama] Empty response for ${engineName} - Ollama may not be running or responding`);
            // Return empty result with flag - frontend will show "Ollama data unavailable"
            return {
                ...(OLLAMA_ONLY ? {} : engineResult),
                ollamaEnhanced: false,
                ollamaRequired: true,
                _ollamaEmpty: true
            };
        }
        // Try to parse JSON from response (Ollama may include markdown formatting)
        let jsonStr = response;
        // Extract JSON from markdown code blocks if present
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }
        else {
            // Try to find JSON object in response
            const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
            if (jsonObjectMatch) {
                jsonStr = jsonObjectMatch[0];
            }
        }
        try {
            const parsed = JSON.parse(jsonStr);
            // Transform to match sheet JSON schema format: {summary, details, risks, next_steps}
            // Map existing fields to new schema while preserving backward compatibility
            const transformed = {
                ...(OLLAMA_ONLY ? {} : engineResult),
                ollamaEnhanced: true,
                _ollamaParsed: true
            };
            // Map to sheet schema format
            if (parsed.summary) {
                transformed.summary = parsed.summary;
            }
            else if (parsed.reason) {
                transformed.summary = parsed.reason;
            }
            else if (parsed.why) {
                transformed.summary = parsed.why;
            }
            else if (parsed.description) {
                transformed.summary = parsed.description;
            }
            // Map details array
            if (Array.isArray(parsed.details)) {
                transformed.details = parsed.details;
            }
            else if (Array.isArray(parsed.requirements)) {
                transformed.details = parsed.requirements;
            }
            else if (Array.isArray(parsed.policies)) {
                transformed.details = parsed.policies;
            }
            else if (Array.isArray(parsed.factors)) {
                transformed.details = parsed.factors;
            }
            // Map risks array
            if (Array.isArray(parsed.risks)) {
                transformed.risks = parsed.risks;
            }
            else if (Array.isArray(parsed.factors) && !transformed.details) {
                // Use factors as risks if details already mapped from factors
                transformed.risks = parsed.factors.slice();
            }
            // Map next_steps array
            if (Array.isArray(parsed.next_steps)) {
                transformed.next_steps = parsed.next_steps;
            }
            else if (Array.isArray(parsed.nextSteps)) {
                transformed.next_steps = parsed.nextSteps;
            }
            else if (Array.isArray(parsed.nextSteps || [])) {
                transformed.next_steps = parsed.nextSteps;
            }
            // Preserve all other fields from parsed response
            Object.keys(parsed).forEach(key => {
                if (!['summary', 'details', 'risks', 'next_steps'].includes(key)) {
                    transformed[key] = parsed[key];
                }
            });
            // Clean up summary/reason fields to remove JSON artifacts
            if (transformed.summary && typeof transformed.summary === 'string') {
                transformed.summary = transformed.summary
                    .replace(/\\n/g, ' ')
                    .replace(/\\"/g, '"')
                    .replace(/\[|\]/g, '')
                    .replace(/\{|\}/g, '') // Remove braces too
                    .replace(/["']+/g, '') // Remove quotes
                    .replace(/^\s*For\s+/i, 'For ')
                    .trim();
            }
            // Clean up arrays - remove JSON formatting from requirements, risks, etc.
            if (parsed.requirements && Array.isArray(parsed.requirements)) {
                parsed.requirements = parsed.requirements.map((r) => {
                    if (typeof r === 'string') {
                        return r.replace(/["'\[\]{}]/g, '').replace(/,+$/, '').trim();
                    }
                    return r;
                }).filter((r) => r && typeof r === 'string' && r.length > 0);
            }
            if (parsed.risks && Array.isArray(parsed.risks)) {
                parsed.risks = parsed.risks.map((r) => {
                    if (typeof r === 'string') {
                        return r.replace(/["'\[\]{}]/g, '').replace(/,+$/, '').trim();
                    }
                    return r;
                }).filter((r) => r && typeof r === 'string' && r.length > 0);
            }
            if (parsed.factors && Array.isArray(parsed.factors)) {
                parsed.factors = parsed.factors.map((f) => {
                    if (typeof f === 'string') {
                        return f.replace(/["'\[\]{}]/g, '').replace(/riskLevel["\s:]+|riskScore["\s:]+|factors["\s:]+/gi, '').replace(/,+$/, '').trim();
                    }
                    return f;
                }).filter((f) => f && typeof f === 'string' && f.length > 5);
            }
            // Clean policies array and filter out placeholders
            if (parsed.policies && Array.isArray(parsed.policies)) {
                parsed.policies = parsed.policies.map((p) => {
                    if (typeof p === 'string') {
                        let clean = p.replace(/["'\[\]{}]/g, '').replace(/,+$/, '').trim();
                        // Filter out placeholder policies
                        if (clean.toLowerCase().includes('policy1') || clean.toLowerCase().includes('policy2') || clean.toLowerCase().includes('policy 1') || clean.toLowerCase().includes('policy 2') || clean.match(/^policy\s*\d+$/i)) {
                            return null;
                        }
                        return clean;
                    }
                    return p;
                }).filter((p) => p && typeof p === 'string' && p.length > 2 && !p.match(/^policy\s*\d+$/i));
                if (!OLLAMA_ONLY) {
                    // If all policies were filtered out, use industry defaults
                    if (parsed.policies.length === 0) {
                        const industryPolicies = {
                            'automobile': ['National Highway Traffic Safety Administration Standards', 'Vehicle Safety Act'],
                            'real-estate': ['Zoning Ordinance', 'Building Code Compliance'],
                            'finance': ['Anti-Money Laundering Act', 'Banking Regulations'],
                            'healthcare': ['HIPAA Compliance', 'Medical Treatment Authorization Policy']
                        };
                        // Get industry from context if available
                        const industry = engineResult.industry || 'general';
                        parsed.policies = industryPolicies[industry.toLowerCase()] || ['Industry Compliance Policy', 'Regulatory Standards'];
                    }
                }
            }
            if (!OLLAMA_ONLY) {
                // CRITICAL FIX: Set permissive defaults BEFORE merging
                // Identity: Default authenticated to true unless EXPLICITLY false
                if (engineName === 'identity') {
                    if (parsed.authenticated === undefined || parsed.authenticated === null || parsed.authenticated !== false) {
                        parsed.authenticated = true;
                    }
                }
                // Compliance/Policy: Default decision to ALLOW unless EXPLICITLY DENY
                if (engineName === 'compliance' || engineName === 'policy') {
                    if (parsed.decision === undefined || parsed.decision === null || (parsed.decision !== 'DENY' && parsed.decision !== 'deny')) {
                        parsed.decision = 'ALLOW';
                    }
                    else {
                        parsed.decision = 'DENY';
                    }
                }
                // Pricing: Ensure all required fields are present (per ENGINES_EXPLANATION.md)
                if (engineName === 'pricing') {
                    if (!parsed.amount || typeof parsed.amount !== 'number') {
                        parsed.amount = 10000;
                    }
                    if (!parsed.currency || typeof parsed.currency !== 'string') {
                        parsed.currency = 'USD';
                    }
                    if (!Array.isArray(parsed.fees)) {
                        parsed.fees = [{ type: 'Service Fee', amount: parsed.amount * 0.01 }];
                    }
                    if (!parsed.pricingModel || typeof parsed.pricingModel !== 'string') {
                        parsed.pricingModel = 'Fixed Rate';
                    }
                    if (!Array.isArray(parsed.paymentTerms)) {
                        parsed.paymentTerms = ['Net 30'];
                    }
                    if (!parsed.totalCost || typeof parsed.totalCost !== 'number') {
                        parsed.totalCost = parsed.amount + (parsed.fees.reduce((sum, fee) => sum + (fee.amount || 0), 0));
                    }
                }
                // Appeals: Ensure all required fields are present (per ENGINES_EXPLANATION.md)
                if (engineName === 'appeals') {
                    if (parsed.eligible === undefined || parsed.eligible === null) {
                        parsed.eligible = true; // Default to eligible
                    }
                    if (!Array.isArray(parsed.process)) {
                        parsed.process = ['Submit appeal form', 'Provide documentation', 'Review by board'];
                    }
                    if (!Array.isArray(parsed.requiredDocs)) {
                        parsed.requiredDocs = [{ type: 'Appeal Form', description: 'Completed appeal application' }];
                    }
                    if (!parsed.timelines || typeof parsed.timelines !== 'object') {
                        parsed.timelines = { initialAppeal: '1-2 days', review: '5-7 days', decision: '10-14 days' };
                    }
                    if (parsed.successProbability === undefined || typeof parsed.successProbability !== 'number') {
                        parsed.successProbability = parsed.eligible ? 0.65 : 0.25;
                    }
                    // Ensure probability is between 0 and 1
                    parsed.successProbability = Math.max(0, Math.min(1, parsed.successProbability));
                }
            }
            // Extract readable text fields from parsed JSON for better frontend display
            // For explainability: Extract reasoning/why text - NEVER use JSON.stringify, NEVER show JSON structure
            if (engineName === 'explainability') {
                // Ensure why is a clean string, not JSON structure
                if (parsed.why) {
                    // If why is an object, extract text fields - convert to readable sentences
                    if (typeof parsed.why === 'object' && !Array.isArray(parsed.why)) {
                        // Extract readable text fields, ignore JSON structure
                        const textParts = [];
                        if (parsed.why.reasoning && typeof parsed.why.reasoning === 'string')
                            textParts.push(parsed.why.reasoning);
                        if (parsed.why.reason && typeof parsed.why.reason === 'string')
                            textParts.push(parsed.why.reason);
                        if (parsed.why.explanation && typeof parsed.why.explanation === 'string')
                            textParts.push(parsed.why.explanation);
                        if (parsed.why.why && typeof parsed.why.why === 'string')
                            textParts.push(parsed.why.why);
                        // If it has an array of factors, convert to readable text
                        if (Array.isArray(parsed.why.reasoning)) {
                            textParts.push(...parsed.why.reasoning.filter((r) => typeof r === 'string'));
                        }
                        if (Array.isArray(parsed.why.factors)) {
                            const factors = parsed.why.factors.map((f) => {
                                if (typeof f === 'string')
                                    return f;
                                if (typeof f === 'object' && f.factor)
                                    return `${f.factor}: ${f.value || ''}`;
                                return '';
                            }).filter((f) => f.length > 0);
                            textParts.push(...factors);
                        }
                        parsed.why = textParts.length > 0 ? textParts.join('. ') : 'Decision reasoning based on intent analysis.';
                    }
                    else if (Array.isArray(parsed.why)) {
                        // If it's an array, join as readable text
                        parsed.why = parsed.why.filter((r) => typeof r === 'string' || (typeof r === 'object' && r.factor))
                            .map((r) => typeof r === 'string' ? r : `${r.factor}: ${r.value || ''}`)
                            .join('. ');
                    }
                }
                else {
                    // If why is missing, use intent-specific default (not generic)
                    parsed.why = `Decision analysis for: "${intentText}". Reviewing requirements and policies specific to this request.`;
                }
                // Aggressively clean up ALL JSON artifacts - remove industry, intent, name, description, id, industries, documents, required_for_intent
                if (typeof parsed.why === 'string') {
                    parsed.why = parsed.why
                        // Remove markdown code blocks
                        .replace(/```json/gi, '')
                        .replace(/```/g, '')
                        // Remove JSON structure markers
                        .replace(/\{|\}/g, '')
                        .replace(/\[|\]/g, '')
                        .replace(/["']+/g, '')
                        .replace(/industry:\s*["']?[^"',}]+["']?/gi, '')
                        .replace(/intent:\s*name:\s*["']?[^"',}]+["']?/gi, '')
                        .replace(/["']?name["']?:\s*["']?[^"',}]+["']?/gi, '')
                        .replace(/["']?description["']?:\s*["']?[^"',}]+["']?/gi, '')
                        .replace(/["']?id["']?:\s*["']?[^"',}]+["']?/gi, '')
                        .replace(/["']?industries["']?:\s*\[/gi, '')
                        .replace(/documents:\s*/gi, '')
                        .replace(/required_for_intent:\s*["']?[^"',}]+["']?/gi, '')
                        .replace(/X/g, '')
                        .replace(/,\s*,/g, ',')
                        .replace(/^\s*,\s*/g, '')
                        .replace(/\\n/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                }
                // Clean factors array if it exists
                if (parsed.factors && Array.isArray(parsed.factors)) {
                    parsed.factors = parsed.factors
                        .map((f) => {
                        let factorText = typeof f === 'string' ? f : String(f);
                        return factorText
                            .replace(/["'\[\]{}]/g, '')
                            .replace(/industry:\s*/gi, '')
                            .replace(/intent:\s*/gi, '')
                            .replace(/name:\s*/gi, '')
                            .replace(/description:\s*/gi, '')
                            .replace(/X/g, '')
                            .trim();
                    })
                        .filter((f) => f.length > 0);
                }
                // Clean nextSteps array if it exists
                if (parsed.nextSteps && Array.isArray(parsed.nextSteps)) {
                    parsed.nextSteps = parsed.nextSteps
                        .map((s) => {
                        let stepText = typeof s === 'string' ? s : String(s);
                        return stepText
                            .replace(/["'\[\]{}]/g, '')
                            .replace(/industry:\s*/gi, '')
                            .replace(/intent:\s*/gi, '')
                            .replace(/name:\s*/gi, '')
                            .replace(/description:\s*/gi, '')
                            .replace(/X/g, '')
                            .trim();
                    })
                        .filter((s) => s.length > 0);
                }
            }
            // For evidence: Ensure records are properly formatted as simple name strings
            if (engineName === 'evidence') {
                // Extract records from documents or records field
                if (parsed.documents && Array.isArray(parsed.documents)) {
                    // Convert documents array to simple records with name only
                    parsed.records = parsed.documents
                        .map((doc) => {
                        // Extract name from various possible fields, but return only name
                        const name = doc.name || doc.type || doc.item || (typeof doc === 'string' ? doc : 'Evidence document');
                        return { name: typeof name === 'string' ? name : String(name) };
                    })
                        .filter((rec) => rec.name && rec.name.trim().length > 0);
                }
                else if (parsed.records && Array.isArray(parsed.records)) {
                    // Clean up records - ensure they only have name field
                    parsed.records = parsed.records
                        .map((rec) => {
                        if (typeof rec === 'string') {
                            return { name: rec };
                        }
                        else if (rec && typeof rec === 'object') {
                            const name = rec.name || rec.type || rec.item || 'Evidence document';
                            return { name: typeof name === 'string' ? name : String(name) };
                        }
                        return null;
                    })
                        .filter((rec) => rec && rec.name && rec.name.trim().length > 0);
                }
                // Remove any description, type, or other nested fields to keep it simple
                if (parsed.records && Array.isArray(parsed.records)) {
                    parsed.records = parsed.records.map((rec) => ({ name: rec.name || String(rec) }));
                }
            }
            // For routing: Extract route path from object if needed
            if (engineName === 'routing' && parsed.route) {
                if (typeof parsed.route === 'object') {
                    parsed.route = parsed.route.path || parsed.route.name || parsed.executionPath?.join(' → ') || (OLLAMA_ONLY ? undefined : 'default');
                }
            }
            // Merge parsed response with original result, prioritizing Ollama response
            const enhanced = {
                ...(OLLAMA_ONLY ? {} : engineResult),
                ...parsed,
                ollamaEnhanced: true, // Always set this flag
                _ollamaParsed: true
            };
            return enhanced;
        }
        catch (parseError) {
            // If JSON parsing fails, enhance with text response
            console.warn(`[Ollama] JSON parse failed for ${engineName}, using text extraction`);
            // Extract useful information from text response even if not JSON
            const enhanced = {
                ...(OLLAMA_ONLY ? {} : engineResult),
                ollamaEnhanced: true,
                _ollamaRawText: response.substring(0, 500) // Keep raw text for debugging
            };
            // Use the text response directly for key fields
            if (engineName === 'explainability') {
                enhanced.why = response.substring(0, 1500);
                console.log(`[Ollama] Set explainability.why:`, enhanced.why.substring(0, 200));
            }
            else if (engineName === 'compliance') {
                // Extract clean reason text, removing JSON structure
                let reasonText = response;
                // Try to extract reason from JSON if present
                const reasonMatch = response.match(/"reason"\s*:\s*"([^"]+)"/i) || response.match(/"reason"\s*:\s*"([^"]*\\n[^"]*)"+/i);
                if (reasonMatch) {
                    reasonText = reasonMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
                }
                else {
                    // Extract from lines, removing JSON structure
                    reasonText = response.split('\n')
                        .filter(line => line.trim() && !line.trim().startsWith('{') && !line.trim().startsWith('}') && !line.trim().startsWith('"decision"') && !line.trim().startsWith('"requirements"'))
                        .map(line => line.replace(/^["\s]*/, '').replace(/["\s]*$/, '').replace(/\\n/g, ' '))
                        .join(' ')
                        .substring(0, 500);
                }
                enhanced.reason = reasonText.trim();
                console.log(`[Ollama] Set compliance.reason:`, enhanced.reason.substring(0, 200));
                // Extract decision ONLY from explicit "decision" field in JSON
                const decisionMatch = response.match(/"decision"\s*:\s*"?(DENY|ALLOW)"?/i);
                if (decisionMatch && decisionMatch[1]) {
                    enhanced.decision = decisionMatch[1].toUpperCase();
                }
                else if (!OLLAMA_ONLY) {
                    // Default to ALLOW if no explicit decision field found (be permissive)
                    enhanced.decision = 'ALLOW';
                }
                // Extract policies array - get REAL policy names, filter out placeholders
                const policiesMatch = response.match(/"policies"\s*:\s*\[([^\]]+)\]/i);
                if (policiesMatch) {
                    const policiesStr = policiesMatch[1];
                    const policies = policiesStr.split(',').slice(0, 5).map(p => {
                        let clean = p.replace(/["'\[\]]/g, '').trim();
                        // Filter out placeholder policies
                        if (clean.toLowerCase().includes('policy1') || clean.toLowerCase().includes('policy2') || clean.toLowerCase().includes('policy 1') || clean.toLowerCase().includes('policy 2')) {
                            return null;
                        }
                        return clean;
                    }).filter(p => p && p.length > 2 && !p.match(/^policy\s*\d+$/i));
                    if (policies.length > 0) {
                        enhanced.policies = policies;
                    }
                    else if (!OLLAMA_ONLY) {
                        // Generate real policy names based on industry
                        const industryPolicies = {
                            'automobile': ['National Highway Traffic Safety Administration Standards', 'Vehicle Safety Act', 'Emissions Control Regulations'],
                            'real-estate': ['Zoning Ordinance', 'Building Code Compliance', 'Property Transfer Regulations'],
                            'finance': ['Anti-Money Laundering Act', 'Banking Regulations', 'Consumer Financial Protection Rules'],
                            'healthcare': ['HIPAA Compliance', 'Medical Treatment Authorization Policy', 'Patient Privacy Regulations']
                        };
                        enhanced.policies = industryPolicies[industry.toLowerCase()] || ['Industry Compliance Policy', 'Regulatory Standards'];
                    }
                }
                else if (!OLLAMA_ONLY) {
                    // Fallback: generate real policy names based on industry
                    const industryPolicies = {
                        'automobile': ['National Highway Traffic Safety Administration Standards', 'Vehicle Safety Act', 'Emissions Control Regulations'],
                        'real-estate': ['Zoning Ordinance', 'Building Code Compliance', 'Property Transfer Regulations'],
                        'finance': ['Anti-Money Laundering Act', 'Banking Regulations', 'Consumer Financial Protection Rules'],
                        'healthcare': ['HIPAA Compliance', 'Medical Treatment Authorization Policy', 'Patient Privacy Regulations']
                    };
                    enhanced.policies = industryPolicies[industry.toLowerCase()] || ['Industry Compliance Policy', 'Regulatory Standards'];
                }
                console.log(`[Ollama] Set policy.policies:`, enhanced.policies);
            }
            else if (engineName === 'risk') {
                // Try to extract risk level from text
                const riskMatch = response.match(/(?:risk|level)[\s:]+(low|medium|high|critical)/i);
                if (riskMatch) {
                    enhanced.riskLevel = riskMatch[1].toUpperCase();
                }
                // Extract factors from lines - AGGRESSIVELY CLEAN UP ALL JSON FORMATTING
                enhanced.factors = response.split('\n')
                    .filter((line) => {
                    const trimmed = line.trim();
                    return trimmed.length > 5 && // Must be meaningful length
                        !trimmed.startsWith('{') &&
                        !trimmed.startsWith('}') &&
                        !trimmed.startsWith('[') &&
                        !trimmed.startsWith(']') &&
                        !trimmed.match(/^["']?\{/) && // Not JSON object start
                        !trimmed.match(/^["']?\[/) && // Not JSON array start
                        !trimmed.includes('"riskLevel"') &&
                        !trimmed.includes('"riskScore"') &&
                        !trimmed.includes('"factors"') &&
                        !trimmed.startsWith('"factors"') &&
                        !trimmed.match(/^\s*"riskLevel"/) &&
                        !trimmed.match(/^\s*"riskScore"/) &&
                        !trimmed.match(/^\s*"factors"/);
                })
                    .slice(0, 5)
                    .map((line) => {
                    // Aggressively clean up line - remove ALL JSON formatting
                    let clean = line.trim()
                        .replace(/^[-•\d.\s"']+/, '') // Remove bullets, numbers, leading quotes
                        .replace(/["']+$/, '') // Remove trailing quotes
                        .replace(/^\[|\]$/g, '') // Remove brackets
                        .replace(/^\{|\}$/g, '') // Remove braces
                        .replace(/["'\[\]{}]/g, '') // Remove ALL JSON structure chars
                        .replace(/,+$/, '') // Remove trailing commas
                        .replace(/^factors["\s:]+\[?/i, '') // Remove "factors": [
                        .replace(/^"factors"["\s:]+\[?/i, '') // Remove "factors": [
                        .replace(/riskLevel["\s:]+/gi, '') // Remove riskLevel:
                        .replace(/riskScore["\s:]+/gi, '') // Remove riskScore:
                        .replace(/factors["\s:]+\[?/gi, '') // Remove factors: [
                        .trim();
                    return clean;
                })
                    .filter(f => {
                    // Filter out JSON artifacts and very short lines
                    return f &&
                        f.length > 5 && // Must be meaningful
                        !f.match(/^["'\[\]{}]/) && // Not starting with JSON chars
                        !f.match(/["'\[\]{}]$/) && // Not ending with JSON chars
                        !f.includes('riskLevel') &&
                        !f.includes('riskScore') &&
                        !f.includes('"factors"');
                });
                console.log(`[Ollama] Set risk factors (cleaned):`, enhanced.factors);
            }
            else if (engineName === 'policy') {
                // Extract clean reason text, removing JSON structure
                let reasonText = response;
                const reasonMatch = response.match(/"reason"\s*:\s*"([^"]+)"/i) || response.match(/"reason"\s*:\s*"([^"]*\\n[^"]*)"+/i);
                if (reasonMatch) {
                    reasonText = reasonMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
                }
                else {
                    reasonText = response.split('\n')
                        .filter(line => line.trim() && !line.trim().startsWith('{') && !line.trim().startsWith('}') && !line.trim().startsWith('"decision"'))
                        .map(line => line.replace(/^["\s]*/, '').replace(/["\s]*$/, '').replace(/\\n/g, ' '))
                        .join(' ')
                        .substring(0, 500);
                }
                enhanced.reason = reasonText.trim();
                console.log(`[Ollama] Set policy.reason:`, enhanced.reason.substring(0, 200));
                // Extract decision ONLY from explicit "decision" field in JSON
                const decisionMatch = response.match(/"decision"\s*:\s*"?(DENY|ALLOW)"?/i);
                if (decisionMatch && decisionMatch[1]) {
                    enhanced.decision = decisionMatch[1].toUpperCase();
                }
                else if (!OLLAMA_ONLY) {
                    // Default to ALLOW if no explicit decision field found (be permissive)
                    enhanced.decision = 'ALLOW';
                }
                // Extract policies array - get REAL policy names, filter out placeholders
                const policiesMatch = response.match(/"policies"\s*:\s*\[([^\]]+)\]/i);
                if (policiesMatch) {
                    const policiesStr = policiesMatch[1];
                    const policies = policiesStr.split(',').slice(0, 5).map(p => {
                        let clean = p.replace(/["'\[\]]/g, '').trim();
                        // Filter out placeholder policies
                        if (clean.toLowerCase().includes('policy1') || clean.toLowerCase().includes('policy2') || clean.toLowerCase().includes('policy 1') || clean.toLowerCase().includes('policy 2') || clean.match(/^policy\s*\d+$/i)) {
                            return null;
                        }
                        return clean;
                    }).filter(p => p && p.length > 2 && !p.match(/^policy\s*\d+$/i));
                    if (policies.length > 0) {
                        enhanced.policies = policies;
                    }
                    else if (!OLLAMA_ONLY) {
                        // Generate real policy names based on industry
                        const industryPolicies = {
                            'automobile': ['National Highway Traffic Safety Administration Standards', 'Vehicle Safety Act', 'Emissions Control Regulations'],
                            'real-estate': ['Zoning Ordinance', 'Building Code Compliance', 'Property Transfer Regulations'],
                            'finance': ['Anti-Money Laundering Act', 'Banking Regulations', 'Consumer Financial Protection Rules'],
                            'healthcare': ['HIPAA Compliance', 'Medical Treatment Authorization Policy', 'Patient Privacy Regulations']
                        };
                        enhanced.policies = industryPolicies[industry.toLowerCase()] || ['Industry Compliance Policy', 'Regulatory Standards'];
                    }
                }
                else if (!OLLAMA_ONLY) {
                    // Fallback: generate real policy names based on industry
                    const industryPolicies = {
                        'automobile': ['National Highway Traffic Safety Administration Standards', 'Vehicle Safety Act', 'Emissions Control Regulations'],
                        'real-estate': ['Zoning Ordinance', 'Building Code Compliance', 'Property Transfer Regulations'],
                        'finance': ['Anti-Money Laundering Act', 'Banking Regulations', 'Consumer Financial Protection Rules'],
                        'healthcare': ['HIPAA Compliance', 'Medical Treatment Authorization Policy', 'Patient Privacy Regulations']
                    };
                    enhanced.policies = industryPolicies[industry.toLowerCase()] || ['Industry Compliance Policy', 'Regulatory Standards'];
                }
                console.log(`[Ollama] Set policy.policies (text extraction):`, enhanced.policies);
            }
            else if (engineName === 'evidence') {
                // Try to extract evidence items
                const lines = response.split('\n').filter((line) => line.trim().length > 0);
                enhanced.records = lines.slice(0, 10).map((line) => ({
                    item: line.trim().replace(/^[-•\d.\s]+/, ''),
                    status: line.includes('✓') || line.toLowerCase().includes('present') ? '✓' : '✖',
                    valid: line.includes('✓') || line.toLowerCase().includes('present')
                }));
                console.log(`[Ollama] Set evidence records:`, enhanced.records.length);
            }
            else if (engineName === 'change') {
                // Extract change information with better parsing
                const changeTypeMatch = response.match(/changeType["\s:]+["']?([^"',\n}]+)["']?/i) || response.match(/change.*type["\s:]+["']?([^"',\n}]+)["']?/i);
                enhanced.changeType = changeTypeMatch
                    ? changeTypeMatch[1].trim()
                    : (OLLAMA_ONLY ? undefined : (intentText.toLowerCase().includes('buy') ? 'Property Purchase' : intentText.toLowerCase().includes('sell') ? 'Property Sale' : 'Standard Change'));
                const impactMatch = response.match(/impactLevel["\s:]+["']?(LOW|MEDIUM|HIGH)["']?/i) || response.match(/impact.*level["\s:]+(low|medium|high)/i);
                enhanced.impactLevel = impactMatch ? impactMatch[1].toUpperCase() : (OLLAMA_ONLY ? undefined : 'MEDIUM');
                const statusMatch = response.match(/status["\s:]+["']?(Approved|Pending|Rejected)["']?/i) || response.match(/(?:approved|pending)/i);
                enhanced.status = statusMatch ? statusMatch[1] : (OLLAMA_ONLY ? undefined : (response.toLowerCase().includes('approved') ? 'Approved' : 'Pending'));
                enhanced.changeId = `CHG-${Date.now()}`;
                console.log(`[Ollama] Set change: ${enhanced.changeType}, ${enhanced.impactLevel}, ${enhanced.status}`);
            }
            else if (engineName === 'ai') {
                // Extract AI insights with better parsing
                const advisoryMatch = response.match(/advisory["\s:]+["']?([^"']+)["']?/i) || response.match(/advice["\s:]+["']?([^"']+)["']?/i);
                enhanced.advisory = advisoryMatch ? advisoryMatch[1].trim().substring(0, 300) : response.split('\n').filter(l => l.trim() && !l.includes('{') && !l.includes('[')).slice(0, 2).join(' ').substring(0, 300);
                if ((!enhanced.advisory || enhanced.advisory.length < 10) && !OLLAMA_ONLY) {
                    enhanced.advisory = `Based on ${intentText}, consider market conditions, timing, and compliance requirements. Review all documentation carefully before proceeding.`;
                }
                const insights = response.split('\n').filter((line) => line.trim().length > 10 && !line.includes('{') && !line.includes('[') && !line.toLowerCase().includes('json')).slice(0, 5);
                enhanced.insights = insights.map((line) => line.trim().replace(/^[-•\d.\s"']+/, '').substring(0, 100));
                enhanced.recommendations = insights.slice(0, 3).map((line, idx) => ({ id: idx + 1, description: line.trim().replace(/^[-•\d.\s"']+/, '').substring(0, 150) }));
                if (enhanced.recommendations.length === 0 && !OLLAMA_ONLY) {
                    enhanced.recommendations = [{ id: 1, description: 'Review all requirements carefully' }];
                }
                console.log(`[Ollama] Set AI advisory (${enhanced.advisory.length} chars) and ${enhanced.recommendations.length} recommendations`);
            }
            else if (engineName === 'simulation') {
                // Extract simulation data with better parsing
                enhanced.simulated = true;
                const scenarioMatches = response.match(/scenarios?["\s:]+\[([^\]]+)\]/i) || response.match(/scenario["\s:]+["']?([^"'\n}]+)["']?/gi);
                let scenarios = [];
                if (scenarioMatches && scenarioMatches.length > 0) {
                    scenarios = Array.from(scenarioMatches).slice(0, 5).map((match, idx) => ({
                        scenarioId: `SCEN${idx + 1}`,
                        description: match.replace(/scenario["\s:]+/i, '').replace(/["']/g, '').trim().substring(0, 100)
                    }));
                }
                else {
                    // Fallback: extract from lines
                    const lines = response.split('\n').filter((line) => line.trim().length > 15 && !line.includes('{') && !line.includes('[') && !line.toLowerCase().includes('json')).slice(0, 5);
                    scenarios = lines.map((line, idx) => ({
                        scenarioId: `SCEN${idx + 1}`,
                        description: line.trim().replace(/^[-•\d.\s"']+/, '').substring(0, 100)
                    }));
                }
                if (scenarios.length === 0 && !OLLAMA_ONLY) {
                    scenarios = [{ scenarioId: 'SCEN1', description: `Standard processing scenario for ${intentText.substring(0, 50)}` }];
                }
                enhanced.scenarios = scenarios;
                if (!OLLAMA_ONLY) {
                    enhanced.outcomes = scenarios.slice(0, 3).map((scen) => ({
                        scenarioId: scen.scenarioId,
                        outcome: 'SUCCESS'
                    }));
                    enhanced.probabilities = scenarios.slice(0, 3).map((scen) => ({
                        scenarioId: scen.scenarioId,
                        probability: 0.75
                    }));
                }
                console.log(`[Ollama] Set simulation: ${enhanced.scenarios.length} scenarios`);
            }
            else if (engineName === 'pricing') {
                // Extract pricing information with all required fields
                // amount: number
                const amountMatch = response.match(/amount["\s:]+(\d+\.?\d*)/i) || response.match(/amount["\s:]+["']?(\d+\.?\d*)["']?/i);
                enhanced.amount = amountMatch ? parseFloat(amountMatch[1]) : (OLLAMA_ONLY ? undefined : (intentText.toLowerCase().includes('car') ? 25000 : intentText.toLowerCase().includes('house') ? 350000 : 10000));
                // currency: string
                const currencyMatch = response.match(/currency["\s:]+["']?([A-Z]{3})["']?/i) || response.match(/currency["\s:]+([A-Z]{3})/i);
                enhanced.currency = currencyMatch ? currencyMatch[1].toUpperCase() : (OLLAMA_ONLY ? undefined : 'USD');
                // fees: array of objects with type and amount
                const feesMatch = response.match(/fees["\s:]+\[([^\]]+)\]/i);
                let fees = [];
                if (feesMatch) {
                    const feeStrings = feesMatch[1].split(',').slice(0, 5);
                    fees = feeStrings.map((feeStr, idx) => {
                        const typeMatch = feeStr.match(/type["\s:]+["']?([^"']+)["']?/i) || feeStr.match(/"([^"]+)"/);
                        const amountMatch = feeStr.match(/amount["\s:]+(\d+\.?\d*)/i);
                        return {
                            type: typeMatch ? typeMatch[1].trim() : `Fee ${idx + 1}`,
                            amount: amountMatch ? parseFloat(amountMatch[1]) : (enhanced.amount * 0.02)
                        };
                    });
                }
                else if (!OLLAMA_ONLY) {
                    // Fallback: create default fees
                    fees = [
                        { type: 'Service Fee', amount: enhanced.amount * 0.01 },
                        { type: 'Processing Fee', amount: enhanced.amount * 0.005 }
                    ];
                }
                enhanced.fees = fees;
                // pricingModel: string
                const modelMatch = response.match(/pricingModel["\s:]+["']?([^"',\n}]+)["']?/i) || response.match(/pricing.*model["\s:]+["']?([^"',\n}]+)["']?/i);
                enhanced.pricingModel = modelMatch ? modelMatch[1].trim() : (OLLAMA_ONLY ? undefined : 'Fixed Rate');
                // paymentTerms: array of strings
                const termsMatch = response.match(/paymentTerms["\s:]+\[([^\]]+)\]/i);
                if (termsMatch) {
                    const termStrings = termsMatch[1].split(',').slice(0, 5);
                    enhanced.paymentTerms = termStrings.map(t => t.replace(/["'\[\]]/g, '').trim()).filter(t => t.length > 0);
                }
                else if (!OLLAMA_ONLY) {
                    enhanced.paymentTerms = ['Net 30', 'Payment on completion'];
                }
                // totalCost: number (amount + sum of fees)
                const totalMatch = response.match(/totalCost["\s:]+(\d+\.?\d*)/i) || response.match(/total.*cost["\s:]+(\d+\.?\d*)/i);
                if (totalMatch) {
                    enhanced.totalCost = parseFloat(totalMatch[1]);
                }
                else if (!OLLAMA_ONLY && enhanced.amount != null) {
                    enhanced.totalCost = enhanced.amount + fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
                }
                console.log(`[Ollama] Set pricing: ${enhanced.currency} ${enhanced.amount}, ${enhanced.fees.length} fees, total: ${enhanced.totalCost}`);
            }
            else if (engineName === 'appeals') {
                // Extract appeals information with all required fields
                // eligible: boolean
                const eligibleMatch = response.match(/eligible["\s:]+(true|false)/i) || response.match(/eligible["\s:]+["']?(true|false)["']?/i);
                enhanced.eligible = eligibleMatch ? eligibleMatch[1].toLowerCase() === 'true' : (OLLAMA_ONLY ? undefined : true); // Default to eligible
                // process: array of strings
                const processMatch = response.match(/process["\s:]+\[([^\]]+)\]/i);
                if (processMatch) {
                    const processStrings = processMatch[1].split(',').slice(0, 10);
                    enhanced.process = processStrings.map(p => p.replace(/["'\[\]]/g, '').trim()).filter(p => p.length > 0);
                }
                else {
                    // Fallback: extract from lines
                    const lines = response.split('\n').filter((line) => line.trim().length > 10 && !line.includes('{') && !line.includes('[') && !line.toLowerCase().includes('json')).slice(0, 10);
                    enhanced.process = lines.map((line) => line.trim().replace(/^[-•\d.\s"']+/, '').substring(0, 100));
                }
                if (enhanced.process.length === 0 && !OLLAMA_ONLY) {
                    enhanced.process = ['Submit appeal form', 'Provide supporting documentation', 'Review by appeals board', 'Receive decision'];
                }
                // requiredDocs: array of objects with type and description
                const docsMatch = response.match(/requiredDocs["\s:]+\[([^\]]+)\]/i);
                let requiredDocs = [];
                if (docsMatch) {
                    const docStrings = docsMatch[1].split('},').slice(0, 10);
                    requiredDocs = docStrings.map((docStr, idx) => {
                        const typeMatch = docStr.match(/type["\s:]+["']?([^"']+)["']?/i) || docStr.match(/"([^"]+)"/);
                        const descMatch = docStr.match(/description["\s:]+["']?([^"']+)["']?/i);
                        return {
                            type: typeMatch ? typeMatch[1].trim() : `Document ${idx + 1}`,
                            description: descMatch ? descMatch[1].trim() : 'Required supporting document'
                        };
                    });
                }
                else if (!OLLAMA_ONLY) {
                    // Fallback: create default documents
                    requiredDocs = [
                        { type: 'Appeal Form', description: 'Completed appeal application form' },
                        { type: 'Supporting Evidence', description: 'Documentation supporting the appeal' }
                    ];
                }
                enhanced.requiredDocs = requiredDocs;
                // timelines: object with timeframe info
                const timelinesMatch = response.match(/timelines["\s:]+\{([^}]+)\}/i);
                if (timelinesMatch) {
                    const timelineStr = timelinesMatch[1];
                    const initialMatch = timelineStr.match(/initialAppeal["\s:]+["']?([^"',}]+)["']?/i);
                    const reviewMatch = timelineStr.match(/review["\s:]+["']?([^"',}]+)["']?/i);
                    const decisionMatch = timelineStr.match(/decision["\s:]+["']?([^"',}]+)["']?/i);
                    enhanced.timelines = {
                        initialAppeal: initialMatch ? initialMatch[1].trim() : '1-2 days',
                        review: reviewMatch ? reviewMatch[1].trim() : '5-7 business days',
                        decision: decisionMatch ? decisionMatch[1].trim() : '10-14 days'
                    };
                }
                else if (!OLLAMA_ONLY) {
                    enhanced.timelines = {
                        initialAppeal: '1-2 days',
                        review: '5-7 business days',
                        decision: '10-14 days'
                    };
                }
                // successProbability: number between 0 and 1
                const probMatch = response.match(/successProbability["\s:]+(\d+\.?\d*)/i) || response.match(/probability["\s:]+(\d+\.?\d*)/i);
                if (probMatch) {
                    let prob = parseFloat(probMatch[1]);
                    if (prob > 1)
                        prob = prob / 100; // Convert percentage to decimal
                    enhanced.successProbability = Math.max(0, Math.min(1, prob)); // Clamp between 0 and 1
                }
                else if (!OLLAMA_ONLY) {
                    enhanced.successProbability = enhanced.eligible ? 0.65 : 0.25; // Default based on eligibility
                }
                console.log(`[Ollama] Set appeals: eligible=${enhanced.eligible}, ${enhanced.process.length} steps, prob=${enhanced.successProbability}`);
            }
            console.log(`[Ollama] ✅ Using text-enhanced result for ${engineName}`);
            return enhanced;
        }
    }
}
/**
 * Generate summary details (vehicle, property, patient, account info) from intent using Ollama
 */
async function generateSummaryDetails(intentText, industry, payload) {
    try {
        const prompt = `Intent: "${intentText}" | Industry: ${industry}

Extract relevant details for a ${industry} summary. Return ONLY JSON with appropriate fields:

${industry === 'automobile' ? `- vin: Vehicle Identification Number (e.g., "1HGCM82633A004352")
- make: Vehicle make (e.g., "Toyota", "Honda", "Ford")
- model: Vehicle model with year (e.g., "Camry 2022", "Civic 2023", "F-150 2024")
- currentOwner: Current owner ID (e.g., "Seller ID SL-3239")
- declaredValue: Declared value in USD (number, e.g., 25000)` : ''}
${industry === 'real-estate' ? `- address: Property address (e.g., "123 Main St, Springfield")
- parcelId: Parcel identifier (e.g., "SP-12345")
- zoning: Zoning designation (e.g., "Residential R2", "Commercial C1")
- assessedValue: Assessed value in USD (number, e.g., 500000)` : ''}
${industry === 'healthcare' ? `- patientId: Patient identifier (e.g., "PT-12345")
- age: Patient age (number, e.g., 54)
- diagnosis: Primary diagnosis (e.g., "Type II Diabetes", "Hypertension")
- clinic: Requesting clinic name (e.g., "Springfield Medical Group")` : ''}
${industry === 'finance' ? `- accountId: Account identifier (e.g., "AC-123456")
- customer: Customer name (e.g., "John Doe")
- amount: Transfer amount in USD (number, e.g., 10000)
- destination: Destination (e.g., "External Wire", "Internal Transfer")` : ''}

Generate realistic details based on the intent "${intentText}". If specific details are not mentioned, infer reasonable defaults. Return JSON only.`;
        const response = await callOllama(prompt);
        if (!response || response.trim().length === 0) {
            return {};
        }
        // Extract JSON from response
        let jsonStr = response.trim();
        // Remove markdown code blocks if present
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
        }
        else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
        }
        // Find JSON object in response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        try {
            const parsed = JSON.parse(jsonStr);
            return parsed;
        }
        catch (parseError) {
            console.warn(`[Ollama] Failed to parse summary JSON: ${parseError.message}`);
            return {};
        }
    }
    catch (error) {
        console.warn(`[Ollama] Failed to generate summary details: ${error.message}`);
        return {};
    }
}
/**
 * Generate action items based on intent and results - WITH HYPERLINKS
 */
async function generateActionItems(intentText, industry, payload, allResults, status) {
    const prompt = `USER INTENT: "${intentText}"
INDUSTRY: ${industry}

ANALYZE THE USER'S INTENT: "${intentText}"

Generate PRACTICAL, ACTIONABLE steps the user needs to take to fulfill their request. Each action should:
1. Be a concrete task (book tickets, fill form, register, schedule appointment, etc.)
2. Have a REAL website URL where the user can complete the action
3. Be directly related to what the user wants to accomplish

ACTION TYPES BASED ON INTENT:
- Travel/Trip: Book flights, Book hotels, Get travel insurance, Apply for visa/passport
- Healthcare/Medical: Find doctors/dentists, Schedule appointment, Get insurance, Find clinics
- Forms/Registrations: Fill application form, Submit registration, Complete verification
- Purchases: Find sellers/dealers, Compare prices, Complete purchase, Get insurance
- Services: Book service, Schedule consultation, Register account, Complete setup

URL EXAMPLES BY TOPIC:
- Travel/Flights: https://www.expedia.com, https://www.booking.com, https://www.kayak.com
- Healthcare/Dentists: https://www.zocdoc.com, https://www.healthgrades.com, https://www.healthcare.gov
- Forms/Government: https://www.usa.gov, https://www.uscis.gov, https://travel.state.gov
- Vehicle/Registration: https://www.dmv.org, https://www.dmv.ca.gov
- General Services: https://www.usa.gov

Return ONLY valid JSON array (no text before/after):
[
  {
    "action": "Specific actionable task (e.g., 'Book flight tickets', 'Schedule dentist appointment', 'Fill registration form')",
    "type": "booking|appointment|form|registration|payment|verification|search",
    "priority": "high|medium|low",
    "description": "Clear explanation of what this action does and why it's needed for: ${intentText}",
    "url": "https://real-website-url.com (ACTUAL website where user can complete this action)",
    "blocker": "Optional: If this action addresses a blocker or prerequisite"
  }
]

CRITICAL REQUIREMENTS:
1. Actions MUST be practical tasks the user can DO NOW (book, register, fill, schedule, apply)
2. URLs MUST be real, functional websites (use examples above as reference)
3. Actions MUST directly help fulfill: "${intentText}"
4. Generate 3-7 relevant actions
5. Focus on WHAT the user needs to DO, not just information

User wants: "${intentText}"
Generate practical actions with real URLs. Return JSON array only.`;
    try {
        const response = await callOllama(prompt);
        if (!response) {
            if (OLLAMA_ONLY) {
                return [];
            }
            // Return default action items based on status
            const defaultActions = [];
            if (status === 'DENIED') {
                defaultActions.push({
                    action: 'Review denial reasons and requirements',
                    type: 'document',
                    priority: 'high',
                    description: 'Review the compliance and policy requirements that led to denial',
                    url: 'https://www.usa.gov/'
                });
            }
            if (status === 'PENDING') {
                defaultActions.push({
                    action: 'Submit required documentation',
                    type: 'document',
                    priority: 'high',
                    description: 'Provide all missing documents and evidence',
                    url: 'https://www.usa.gov/'
                });
            }
            return defaultActions;
        }
        // Extract JSON from response
        let jsonStr = response;
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }
        else {
            const jsonArrayMatch = response.match(/\[[\s\S]*\]/);
            if (jsonArrayMatch) {
                jsonStr = jsonArrayMatch[0];
            }
        }
        try {
            const actions = JSON.parse(jsonStr);
            // Strict validation: Filter out actions that don't relate to the intent
            const intentLower = intentText.toLowerCase();
            const actionsWithUrls = Array.isArray(actions) ? actions
                .filter((action) => {
                const actionText = (action.action || action.description || '').toLowerCase();
                // Extract key words from intent
                const isHealthcare = intentLower.includes('dentist') || intentLower.includes('dental') ||
                    intentLower.includes('doctor') || intentLower.includes('medical') ||
                    intentLower.includes('healthcare') || intentLower.includes('clinic');
                const isVehicle = intentLower.includes('car') || intentLower.includes('vehicle') ||
                    intentLower.includes('automobile') || intentLower.includes('auto');
                const isTravel = intentLower.includes('passport') || intentLower.includes('visa') ||
                    intentLower.includes('travel');
                // Filter out unrelated actions
                if (isHealthcare) {
                    // For healthcare intents, reject travel/vehicle actions
                    if (actionText.includes('passport') || actionText.includes('visa') ||
                        actionText.includes('emission') || actionText.includes('dmv') ||
                        actionText.includes('vehicle') || actionText.includes('car registration')) {
                        console.log(`[Action Filter] Rejected unrelated action for healthcare intent: ${action.action}`);
                        return false;
                    }
                }
                if (isVehicle) {
                    // For vehicle intents, reject healthcare/travel actions
                    if (actionText.includes('dentist') || actionText.includes('dental') ||
                        actionText.includes('doctor') || actionText.includes('medical') ||
                        actionText.includes('passport') || actionText.includes('visa')) {
                        console.log(`[Action Filter] Rejected unrelated action for vehicle intent: ${action.action}`);
                        return false;
                    }
                }
                if (isTravel) {
                    // For travel intents, reject healthcare/vehicle actions
                    if (actionText.includes('dentist') || actionText.includes('dental') ||
                        actionText.includes('emission') || actionText.includes('dmv')) {
                        console.log(`[Action Filter] Rejected unrelated action for travel intent: ${action.action}`);
                        return false;
                    }
                }
                return true;
            })
                .map((action) => ({
                ...action,
                url: action.url || (OLLAMA_ONLY ? '' : generateDefaultUrl(action.action || action.description || '', industry))
            }))
                .filter((action) => !OLLAMA_ONLY || (action.url && String(action.url).trim().length > 0)) : [];
            console.log(`[Action Items] Generated ${actionsWithUrls.length} actions for intent: "${intentText}"`);
            return actionsWithUrls;
        }
        catch (parseError) {
            console.warn(`Failed to parse action items JSON for intent: "${intentText}"`);
            // If parsing fails, return empty array - no hardcoded fallbacks
            // All actions must come from Ollama's JSON response
            return [];
        }
    }
    catch (error) {
        console.warn(`Action items generation failed: ${error.message}`);
        return [];
    }
}
/**
 * Generate default URL for action based on action text and industry
 */
function generateDefaultUrl(action, industry) {
    if (OLLAMA_ONLY)
        return '';
    const lowerAction = action.toLowerCase();
    // Travel/Booking related
    if (lowerAction.includes('flight') || lowerAction.includes('book flight') || lowerAction.includes('ticket')) {
        return 'https://www.expedia.com';
    }
    if (lowerAction.includes('hotel') || lowerAction.includes('book hotel') || lowerAction.includes('accommodation')) {
        return 'https://www.booking.com';
    }
    if (lowerAction.includes('travel') || lowerAction.includes('trip') || lowerAction.includes('vacation')) {
        return 'https://www.kayak.com';
    }
    if (lowerAction.includes('passport'))
        return 'https://travel.state.gov/content/travel/en/passports.html';
    if (lowerAction.includes('visa'))
        return 'https://travel.state.gov/content/travel/en/us-visas.html';
    // Healthcare/Medical related
    if (lowerAction.includes('dentist') || lowerAction.includes('dental') || lowerAction.includes('find dentist')) {
        return 'https://www.zocdoc.com';
    }
    if (lowerAction.includes('doctor') || lowerAction.includes('physician') || lowerAction.includes('schedule appointment') || lowerAction.includes('medical appointment')) {
        return 'https://www.zocdoc.com';
    }
    if (lowerAction.includes('clinic') || lowerAction.includes('find clinic') || lowerAction.includes('healthcare provider')) {
        return 'https://www.healthgrades.com';
    }
    if (lowerAction.includes('insurance') && industry === 'healthcare')
        return 'https://www.healthcare.gov/';
    if (lowerAction.includes('consent') || lowerAction.includes('authorization'))
        return 'https://www.hhs.gov/hipaa/index.html';
    // Vehicle related
    if (lowerAction.includes('emission') || lowerAction.includes('smog'))
        return 'https://www.dmv.org/emissions-testing.php';
    if (lowerAction.includes('title') || lowerAction.includes('registration') || lowerAction.includes('vehicle registration')) {
        return 'https://www.dmv.org/vehicle-registration.php';
    }
    if (lowerAction.includes('insurance') && industry === 'automobile')
        return 'https://www.usa.gov/auto-insurance';
    if (lowerAction.includes('car') || lowerAction.includes('vehicle') || lowerAction.includes('dealer')) {
        return 'https://www.usa.gov/buy-sell-car';
    }
    // Forms/Registration related
    if (lowerAction.includes('form') || lowerAction.includes('application') || lowerAction.includes('register') || lowerAction.includes('registration')) {
        return 'https://www.usa.gov/';
    }
    if (lowerAction.includes('document') || lowerAction.includes('submit'))
        return 'https://www.usa.gov/';
    // Real estate related
    if (lowerAction.includes('zoning') || lowerAction.includes('permit'))
        return 'https://www.usa.gov/local-governments';
    // Finance related
    if (lowerAction.includes('kyc') || lowerAction.includes('verification'))
        return 'https://www.usa.gov/banks';
    // Default based on industry
    if (industry === 'healthcare')
        return 'https://www.healthcare.gov/';
    if (industry === 'automobile')
        return 'https://www.dmv.org/';
    if (industry === 'real-estate')
        return 'https://www.usa.gov/local-governments';
    return 'https://www.usa.gov/'; // Default fallback
}
