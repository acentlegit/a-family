// Test script for buildPrompt function
// Usage: npx tsx test-build-prompt.ts

import { buildPrompt } from './src/intent-library-loader';

const testCases = [
  {
    name: 'Strategic Planning (llama3)',
    intent: 'Strategic planning',
    model: 'llama3',
    context: 'Planning Q2 2024 company strategy under budget constraints'
  },
  {
    name: 'Code Generation (codellama)',
    intent: 'Code generation',
    model: 'codellama',
    context: 'Generate REST API endpoint for user authentication with JWT'
  },
  {
    name: 'Requirements Definition (mistral)',
    intent: 'Requirements definition',
    model: 'mistral',
    context: 'Define requirements for mobile app with offline capabilities'
  },
  {
    name: 'Risk Assessment (llama3)',
    intent: 'Risk assessment',
    model: 'llama3',
    context: 'Assessing risks of launching new product in competitive market'
  },
  {
    name: 'Lead Qualification (mistral)',
    intent: 'Lead qualification',
    model: 'mistral',
    context: 'Qualifying B2B enterprise leads for SaaS platform'
  }
];

console.log('═══════════════════════════════════════════════════════════');
console.log('Testing buildPrompt Function');
console.log('═══════════════════════════════════════════════════════════\n');

let successCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Intent: ${testCase.intent}`);
  console.log(`  Model: ${testCase.model}`);
  console.log(`  Context: ${testCase.context.substring(0, 50)}...`);
  
  try {
    // Try to load from Excel file (adjust path as needed)
    const excelPath = './Intent_Library_Ollama_Enterprise_Ready.xlsx';
    const prompt = buildPrompt(
      excelPath,
      testCase.intent,
      testCase.model,
      testCase.context
    );
    
    console.log('  ✅ SUCCESS');
    console.log(`  Prompt length: ${prompt.length} characters`);
    console.log(`  Prompt preview (first 200 chars):`);
    console.log(`  ${prompt.substring(0, 200).replace(/\n/g, ' ')}...\n`);
    successCount++;
  } catch (error: any) {
    console.log('  ❌ FAILED');
    console.log(`  Error: ${error.message}\n`);
    failCount++;
  }
  
  console.log('─────────────────────────────────────────────────────────\n');
});

console.log('═══════════════════════════════════════════════════════════');
console.log(`Summary: ${successCount} passed, ${failCount} failed`);
console.log('═══════════════════════════════════════════════════════════');

if (failCount > 0) {
  console.log('\nNote: Make sure Intent_Library_Ollama_Enterprise_Ready.xlsx file exists');
  console.log('      and contains the required columns and intents.');
  process.exit(1);
}
