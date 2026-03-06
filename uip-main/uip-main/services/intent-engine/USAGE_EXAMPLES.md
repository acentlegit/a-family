# Intent Library Loader - Usage Examples and Testing Guide

## Overview

The `buildPrompt()` function is a TypeScript implementation of the Python `build_prompt` function. It reads from Excel or JSON files and builds formatted prompts for Ollama.

## Function Signature

```typescript
buildPrompt(libraryPath: string, intent: string, model: string, context: string): string
```

**Parameters:**
- `libraryPath`: Path to Excel (.xlsx) or JSON file
- `intent`: Intent name (must match the "Intent" column in your file)
- `model`: One of 'llama3', 'mistral', 'codellama'
- `context`: Runtime context string (optional, defaults to empty string)

**Returns:** Formatted prompt string

## Setup

### 1. Prepare Your Excel File

Your Excel file should have these columns:
- `Category`
- `Intent`
- `System Prompt (llama3)`
- `System Prompt (mistral)`
- `System Prompt (codellama)`
- `Developer Prompt`
- `User Prompt` (can contain `{context}` placeholder)
- `JSON Output Schema`

### 2. Place Your File

Place your Excel file in the project directory:
```
services/intent-engine/Intent_Library_Ollama_Enterprise_Ready.xlsx
```

## Usage Examples

### Example 1: Basic Usage (TypeScript/Node.js)

```typescript
import { buildPrompt } from './src/intent-library-loader';

// Example 1: Strategic planning with llama3
const prompt1 = buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Strategic planning',
  'llama3',
  'Planning 2026 company strategy under budget constraints'
);

console.log(prompt1);
```

### Example 2: Using Different Models

```typescript
import { buildPrompt } from './src/intent-library-loader';

// With mistral model
const prompt2 = buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Decision making',
  'mistral',
  'Need to decide between two vendor options'
);

// With codellama model
const prompt3 = buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Code generation',
  'codellama',
  'Generate REST API endpoint for user authentication'
);
```

### Example 3: Different Intent Categories

```typescript
import { buildPrompt } from './src/intent-library-loader';

// Executive & Strategy
const execPrompt = buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Risk assessment',
  'llama3',
  'Assessing risks of launching new product'
);

// Product Management
const productPrompt = buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Requirements definition',
  'llama3',
  'Defining requirements for mobile app'
);

// Engineering & Technical
const engPrompt = buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Code review',
  'codellama',
  'Review authentication service code'
);

// Sales
const salesPrompt = buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Lead qualification',
  'mistral',
  'Qualifying B2B enterprise leads'
);
```

## Testing Examples

### Test 1: Run the Example Script

```bash
cd services/intent-engine
npx tsx src/build-prompt-example.ts
```

### Test 2: Create a Test Script

Create a file `test-build-prompt.ts`:

```typescript
import { buildPrompt } from './src/intent-library-loader';

const testCases = [
  {
    intent: 'Strategic planning',
    model: 'llama3',
    context: 'Planning Q2 2024 strategy'
  },
  {
    intent: 'Code generation',
    model: 'codellama',
    context: 'Generate user authentication API'
  },
  {
    intent: 'Requirements definition',
    model: 'mistral',
    context: 'Define mobile app requirements'
  }
];

console.log('=== Testing buildPrompt Function ===\n');

testCases.forEach((testCase, index) => {
  try {
    console.log(`Test ${index + 1}: ${testCase.intent} (${testCase.model})`);
    const prompt = buildPrompt(
      'Intent_Library_Ollama_Enterprise_Ready.xlsx',
      testCase.intent,
      testCase.model,
      testCase.context
    );
    console.log('✅ Success!');
    console.log('Prompt length:', prompt.length, 'characters');
    console.log('---\n');
  } catch (error: any) {
    console.log('❌ Error:', error.message);
    console.log('---\n');
  }
});
```

Run it:
```bash
npx tsx test-build-prompt.ts
```

### Test 3: Integration with Ollama Service

You can also integrate this into the existing `ollama-service.ts`:

```typescript
import { buildPrompt } from './intent-library-loader';

// In your generateEngineResponse function
const prompt = buildPrompt(
  './Intent_Library_Ollama_Enterprise_Ready.xlsx',
  intentName,
  OLLAMA_MODEL,
  context
);

// Then use the prompt with Ollama
const response = await callOllama(prompt);
```

## Using with JSON Instead of Excel

### Convert Excel to JSON

You can create a JSON file with the same structure:

```json
{
  "intents": [
    {
      "category": "Executive & Strategy",
      "intent": "Strategic planning",
      "systemPromptLlama3": "You are a senior Executive & Strategy expert...",
      "systemPromptMistral": "You are a concise assistant...",
      "systemPromptCodeLlama": "You are a coding-focused assistant...",
      "developerPrompt": "Follow internal standards...",
      "userPromptTemplate": "Intent: {intent} Context: {context} Produce output...",
      "jsonOutputSchema": "{\"summary\": \"string\", \"details\": \"array\", \"risks\": \"array\", \"next_steps\": \"array\"}"
    }
  ]
}
```

Then use it:
```typescript
const prompt = buildPrompt(
  'intent-library.json',
  'Strategic planning',
  'llama3',
  'Planning 2026 strategy'
);
```

## Error Handling

```typescript
import { buildPrompt } from './src/intent-library-loader';

try {
  const prompt = buildPrompt(
    'Intent_Library_Ollama_Enterprise_Ready.xlsx',
    'Strategic planning',
    'llama3',
    'Context here'
  );
  console.log(prompt);
} catch (error: any) {
  if (error.message.includes('Intent not found')) {
    console.error('The intent does not exist in the library');
  } else if (error.message.includes('not found')) {
    console.error('The Excel/JSON file was not found');
  } else {
    console.error('Error:', error.message);
  }
}
```

## Available Intents (Based on Your Library)

### Executive & Strategy
- Strategic planning
- Decision making
- Scenario analysis
- Risk assessment
- Executive briefing
- Goal setting (OKRs)
- Market entry analysis
- Portfolio prioritization
- Trade-off evaluation
- Vision articulation

### Product Management
- Requirements definition
- Feature ideation
- Roadmap planning
- Prioritization
- Launch planning
- User research synthesis
- Post-launch analysis
- Stakeholder alignment
- Product documentation
- Problem discovery

### Engineering & Technical
- Code generation
- Code refactoring
- Code review
- Debugging
- Performance optimization
- Security analysis
- Architecture design
- System scalability planning
- API design
- Technical documentation

### Sales
- Lead generation
- Lead qualification
- Sales messaging
- Pitch creation
- Proposal drafting
- Pricing strategy
- Objection handling
- Forecasting
- Account planning
- Sales enablement

### Marketing & Growth
- Market research
- Audience segmentation
- Brand positioning
- Campaign planning
- Content ideation
- Copywriting
- SEO optimization
- Growth experimentation
- Funnel optimization
- Performance reporting

### HR & People Ops
- Role definition
- Hiring strategy
- Job description creation
- Interview design
- Candidate evaluation
- Onboarding design
- Performance reviews
- Compensation benchmarking
- Policy drafting
- Learning & development

### Finance
- Budget planning
- Financial modeling
- Cost analysis
- Revenue forecasting
- ROI analysis
- Variance analysis
- Cash flow analysis
- Pricing analysis
- Risk assessment
- Capital allocation

### Legal & Compliance
- Contract review
- Clause explanation
- Risk identification
- Policy interpretation
- Compliance checklist
- Regulatory analysis
- Legal research
- IP analysis
- Privacy assessment
- Audit preparation

### AI & Automation
- Prompt creation
- Prompt optimization
- Agent design
- Workflow automation
- Model selection
- Risk assessment
- Evaluation metrics
- Bias detection
- Policy drafting
- Adoption planning

## Quick Test Commands

```bash
# Navigate to intent-engine directory
cd services/intent-engine

# Run the example
npx tsx src/build-prompt-example.ts

# Or if you create a test file
npx tsx test-build-prompt.ts
```

## Troubleshooting

1. **File not found**: Make sure the Excel/JSON file path is correct
2. **Intent not found**: Check that the intent name matches exactly (case-insensitive)
3. **xlsx package error**: Run `npm install xlsx` if not already installed
4. **Module not found**: Make sure you're running from the correct directory

## Next Steps

1. Place your Excel file in the `services/intent-engine/` directory
2. Test with the example script
3. Integrate into your ollama-service.ts if needed
4. Use in your application code
