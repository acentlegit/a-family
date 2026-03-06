// Real-World Test Prompts - Practical business scenarios
// Usage: npx tsx real-world-test.ts

import { buildPrompt } from './src/intent-library-loader';

const excelPath = './Intent_Library_Ollama_Enterprise_Ready.xlsx';

const realWorldTests = [
  {
    name: 'Strategic Planning - Market Expansion',
    intent: 'Strategic planning',
    model: 'llama3',
    context: 'We need to expand our SaaS platform into the European market in Q3 2024. Our current revenue is $2M annually, and we have a team of 25 employees. Budget constraint: $500K for expansion. Need to decide between establishing a local office or working with distributors.'
  },
  {
    name: 'Decision Making - Infrastructure Scaling',
    intent: 'Decision making',
    model: 'llama3',
    context: 'Our current database infrastructure is struggling with 10x user growth. We need to decide: (1) Scale existing PostgreSQL setup with read replicas ($200K), (2) Migrate to AWS RDS with auto-scaling ($150K setup + $50K/month), or (3) Implement sharding on current infrastructure ($300K one-time). Decision needed within 2 weeks.'
  },
  {
    name: 'Code Generation - Authentication API',
    intent: 'Code generation',
    model: 'codellama',
    context: 'Generate a REST API endpoint in Node.js/Express for user authentication. Requirements: POST /api/auth/login that accepts email/password, validates credentials against PostgreSQL, returns JWT token, includes rate limiting (5 requests/minute), error handling, and logs authentication attempts.'
  },
  {
    name: 'Requirements Definition - Mobile App',
    intent: 'Requirements definition',
    model: 'mistral',
    context: 'We are building a mobile app for real estate agents. Key features needed: property search with filters, virtual tour booking, document management, client communication, and commission tracking. Must work offline. Target: 10,000 active users in first year.'
  },
  {
    name: 'Risk Assessment - Fintech Launch',
    intent: 'Risk assessment',
    model: 'llama3',
    context: 'Our fintech startup is launching a new peer-to-peer lending feature. We need to assess regulatory risks in US, UK, and EU markets. Our current compliance team has 3 people. Feature launch planned in 6 months.'
  },
  {
    name: 'Lead Qualification - Enterprise Lead',
    intent: 'Lead qualification',
    model: 'mistral',
    context: 'Enterprise lead from Fortune 500 company. Initial inquiry about our SaaS platform. Company size: 10,000 employees, industry: financial services, budget: "to be determined", timeline: "exploring options", decision maker: VP of Engineering. How to qualify and next steps?'
  },
  {
    name: 'Budget Planning - Q2 2024',
    intent: 'Budget planning',
    model: 'llama3',
    context: 'Create Q2 2024 budget for SaaS startup. Current MRR: $150K, expected growth: 20% MoM. Categories: Engineering (40%), Sales (25%), Marketing (15%), Operations (10%), Admin (10%). Headcount: growing from 50 to 65 employees. Plan for 3 months.'
  },
  {
    name: 'Contract Review - Vendor Agreement',
    intent: 'Contract review',
    model: 'llama3',
    context: 'Review SaaS vendor service agreement. Key terms: 3-year commitment, auto-renewal, $50K/year, termination requires 90-day notice, liability cap at annual fee, data processing addendum mentions GDPR but lacks specific safeguards. Identify risks and recommendations.'
  }
];

console.log('═══════════════════════════════════════════════════════════');
console.log('Real-World Test Prompts');
console.log('═══════════════════════════════════════════════════════════\n');

realWorldTests.forEach((test, index) => {
  console.log(`📋 Test ${index + 1}: ${test.name}`);
  console.log(`   Intent: ${test.intent}`);
  console.log(`   Model: ${test.model}`);
  console.log(`   Context: ${test.context.substring(0, 100)}...`);
  
  try {
    const prompt = buildPrompt(
      excelPath,
      test.intent,
      test.model,
      test.context
    );
    
    console.log('   ✅ SUCCESS');
    console.log(`   Generated prompt (${prompt.length} chars)`);
    console.log(`   Preview: ${prompt.substring(0, 150).replace(/\n/g, ' ')}...\n`);
  } catch (error: any) {
    console.log('   ❌ ERROR:', error.message, '\n');
  }
  
  console.log('─────────────────────────────────────────────────────────\n');
});

console.log('═══════════════════════════════════════════════════════════');
console.log('Real-World Testing Complete!');
console.log('═══════════════════════════════════════════════════════════');
console.log('\n💡 Tip: These prompts represent actual business scenarios');
console.log('   that can be used to test the intent library system.');
