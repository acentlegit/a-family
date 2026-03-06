"use strict";
// Example usage of buildPrompt function (TypeScript equivalent of Python build_prompt)
// Usage: npx tsx src/build-prompt-example.ts
Object.defineProperty(exports, "__esModule", { value: true });
const intent_library_loader_1 = require("./intent-library-loader");
if (require.main === module) {
    try {
        // Example usage (matches Python example)
        const prompt = (0, intent_library_loader_1.buildPrompt)('Intent_Library_Ollama_Enterprise_Ready.xlsx', // or use .json file
        'Strategic planning', 'llama3', 'Planning 2026 company strategy under budget constraints');
        console.log(prompt);
    }
    catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}
