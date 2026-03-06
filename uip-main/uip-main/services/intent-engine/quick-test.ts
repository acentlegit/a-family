// Quick Test Script - Test buildPrompt with common examples
// Usage: npx tsx quick-test.ts

import { buildPrompt } from './src/intent-library-loader';

const excelPath = './Intent_Library_Ollama_Enterprise_Ready.xlsx';

console.log('═══════════════════════════════════════════════════════════');
console.log('Quick Test - buildPrompt Function');
console.log('═══════════════════════════════════════════════════════════\n');

// Test Case 1: Strategic Planning
console.log('📋 Test 1: Strategic Planning');
console.log('─────────────────────────────────────────────────────────');
try {
  const prompt1 = buildPrompt(
    excelPath,
    'Strategic planning',
    'llama3',
    'Planning 2026 company strategy under budget constraints'
  );
  console.log('✅ SUCCESS');
  console.log('Prompt Preview (first 300 chars):');
  console.log(prompt1.substring(0, 300) + '...\n');
} catch (error: any) {
  console.log('❌ ERROR:', error.message, '\n');
}

// Test Case 2: Code Generation
console.log('💻 Test 2: Code Generation');
console.log('─────────────────────────────────────────────────────────');
try {
  const prompt2 = buildPrompt(
    excelPath,
    'Code generation',
    'codellama',
    'Generate REST API endpoint for user authentication with JWT'
  );
  console.log('✅ SUCCESS');
  console.log('Prompt Preview (first 300 chars):');
  console.log(prompt2.substring(0, 300) + '...\n');
} catch (error: any) {
  console.log('❌ ERROR:', error.message, '\n');
}

// Test Case 3: Requirements Definition
console.log('📝 Test 3: Requirements Definition');
console.log('─────────────────────────────────────────────────────────');
try {
  const prompt3 = buildPrompt(
    excelPath,
    'Requirements definition',
    'mistral',
    'Define requirements for mobile app with offline capabilities'
  );
  console.log('✅ SUCCESS');
  console.log('Prompt Preview (first 300 chars):');
  console.log(prompt3.substring(0, 300) + '...\n');
} catch (error: any) {
  console.log('❌ ERROR:', error.message, '\n');
}

// Test Case 4: Risk Assessment
console.log('⚠️  Test 4: Risk Assessment');
console.log('─────────────────────────────────────────────────────────');
try {
  const prompt4 = buildPrompt(
    excelPath,
    'Risk assessment',
    'llama3',
    'Assessing risks of launching new product in competitive market'
  );
  console.log('✅ SUCCESS');
  console.log('Prompt Preview (first 300 chars):');
  console.log(prompt4.substring(0, 300) + '...\n');
} catch (error: any) {
  console.log('❌ ERROR:', error.message, '\n');
}

// Test Case 5: Lead Qualification
console.log('🎯 Test 5: Lead Qualification');
console.log('─────────────────────────────────────────────────────────');
try {
  const prompt5 = buildPrompt(
    excelPath,
    'Lead qualification',
    'mistral',
    'Qualifying B2B enterprise leads for SaaS platform'
  );
  console.log('✅ SUCCESS');
  console.log('Prompt Preview (first 300 chars):');
  console.log(prompt5.substring(0, 300) + '...\n');
} catch (error: any) {
  console.log('❌ ERROR:', error.message, '\n');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('Quick Test Complete!');
console.log('═══════════════════════════════════════════════════════════');
