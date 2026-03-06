// Example usage of buildPrompt function (TypeScript equivalent of Python build_prompt)
// Usage: npx tsx src/build-prompt-example.ts

import { buildPrompt } from './intent-library-loader';

if (require.main === module) {
  try {
    // Example usage (matches Python example)
    const prompt = buildPrompt(
      'Intent_Library_Ollama_Enterprise_Ready.xlsx', // or use .json file
      'Strategic planning',
      'llama3',
      'Planning 2026 company strategy under budget constraints'
    );
    
    console.log(prompt);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
