"use strict";
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
exports.buildPrompt = buildPrompt;
exports.getIntentEntry = getIntentEntry;
exports.getIntentsByCategory = getIntentsByCategory;
exports.loadIntentLibraryData = loadIntentLibraryData;
// Intent Library Loader - TypeScript implementation of Python build_prompt function
// Equivalent to: build_prompt(excel_path, intent, model, context)
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Build a final Ollama prompt from the enterprise intent library
 * TypeScript equivalent of Python build_prompt function
 *
 * @param libraryPath - Path to JSON file or Excel file (e.g., "Intent_Library_Ollama_Enterprise_Ready.xlsx")
 * @param intent - Intent string (must match Excel/JSON "Intent" column)
 * @param model - One of 'llama3', 'mistral', 'codellama'
 * @param context - Runtime context string
 * @returns Final prompt string in the format:
 *   SYSTEM:
 *   {system_prompt}
 *
 *   DEVELOPER:
 *   {developer_prompt}
 *
 *   USER:
 *   {user_prompt}
 *
 *   OUTPUT FORMAT (STRICT JSON):
 *   {schema}
 */
function buildPrompt(libraryPath, intent, model, context = '') {
    const library = loadIntentLibrary(libraryPath);
    const entry = getIntentEntry(library, intent);
    if (!entry) {
        throw new Error(`Intent not found: ${intent}`);
    }
    // Get model-specific system prompt (matches Python: row[f"System Prompt ({model})"])
    let systemPrompt = '';
    const modelLower = model.toLowerCase();
    if (modelLower === 'llama3' || modelLower.includes('llama3')) {
        systemPrompt = entry.systemPromptLlama3 || '';
    }
    else if (modelLower === 'mistral') {
        systemPrompt = entry.systemPromptMistral || '';
    }
    else if (modelLower === 'codellama' || modelLower.includes('codellama')) {
        systemPrompt = entry.systemPromptCodeLlama || '';
    }
    else {
        // Default to llama3 if model not recognized
        systemPrompt = entry.systemPromptLlama3 || '';
    }
    if (!systemPrompt) {
        throw new Error(`System prompt not found for model: ${model}`);
    }
    // Get other fields (matches Python: row["Developer Prompt"], row["User Prompt"], row["JSON Output Schema"])
    const developerPrompt = entry.developerPrompt || '';
    const userPrompt = entry.userPromptTemplate.replace('{context}', context); // Replace {context} like Python
    const schema = entry.jsonOutputSchema || '';
    // Build final prompt (matches Python format exactly)
    const finalPrompt = `SYSTEM:
${systemPrompt}

DEVELOPER:
${developerPrompt}

USER:
${userPrompt}

OUTPUT FORMAT (STRICT JSON):
${schema}
`;
    return finalPrompt;
}
/**
 * Load intent library from JSON or Excel file
 */
function loadIntentLibrary(filePath) {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    const ext = path.extname(fullPath).toLowerCase();
    if (ext === '.json') {
        return loadIntentLibraryFromJSON(fullPath);
    }
    else if (ext === '.xlsx' || ext === '.xls') {
        return loadIntentLibraryFromExcel(fullPath);
    }
    else {
        throw new Error(`Unsupported file format: ${ext}. Use .json or .xlsx`);
    }
}
/**
 * Load intent library from JSON file
 */
function loadIntentLibraryFromJSON(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        // Handle both array format and object with intents property
        const intents = Array.isArray(data) ? data : (data.intents || []);
        return { intents };
    }
    catch (error) {
        console.error(`[IntentLibrary] Error loading JSON: ${error.message}`);
        throw error;
    }
}
/**
 * Load intent library from Excel file (requires xlsx package)
 * Matches Python pandas.read_excel behavior
 * Column names: Category, Intent, System Prompt (llama3), System Prompt (mistral),
 *               System Prompt (codellama), Developer Prompt, User Prompt, JSON Output Schema
 */
function loadIntentLibraryFromExcel(filePath) {
    try {
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; // Read first sheet
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet); // Convert to JSON (like pandas)
        const intents = data.map((row) => ({
            category: row['Category'] || '',
            intent: row['Intent'] || '',
            systemPromptLlama3: row['System Prompt (llama3)'] || '',
            systemPromptMistral: row['System Prompt (mistral)'] || '',
            systemPromptCodeLlama: row['System Prompt (codellama)'] || '',
            developerPrompt: row['Developer Prompt'] || '',
            userPromptTemplate: row['User Prompt'] || '',
            jsonOutputSchema: row['JSON Output Schema'] || '{"summary": "string", "details": "array", "risks": "array", "next_steps": "array"}'
        }));
        return { intents };
    }
    catch (error) {
        console.error(`[IntentLibrary] Error loading Excel: ${error.message}`);
        if (error.message.includes('Cannot find module')) {
            throw new Error('xlsx package not found. Run: npm install xlsx');
        }
        throw error;
    }
}
/**
 * Get intent library entry by intent name (matches Python: df[df['Intent'] == intent])
 */
function getIntentEntry(library, intentName) {
    return library.intents.find(entry => entry.intent.toLowerCase() === intentName.toLowerCase()) || null;
}
/**
 * Get all intents for a category
 */
function getIntentsByCategory(library, category) {
    return library.intents.filter(entry => entry.category.toLowerCase() === category.toLowerCase());
}
/**
 * Load the entire intent library (for inspection/debugging)
 */
function loadIntentLibraryData(filePath) {
    return loadIntentLibrary(filePath);
}
