# Quick Start Guide - buildPrompt Function

## Step 1: Prepare Your Excel File

Make sure you have `Intent_Library_Ollama_Enterprise_Ready.xlsx` with these columns:
- Category
- Intent  
- System Prompt (llama3)
- System Prompt (mistral)
- System Prompt (codellama)
- Developer Prompt
- User Prompt
- JSON Output Schema

Place the file in: `services/intent-engine/Intent_Library_Ollama_Enterprise_Ready.xlsx`

## Step 2: Install Dependencies (if not already done)

```bash
cd services/intent-engine
npm install
```

## Step 3: Test the Function

### Option A: Run the Test Script

```bash
npx tsx test-build-prompt.ts
```

### Option B: Run the Example

```bash
npx tsx src/build-prompt-example.ts
```

### Option C: Use in Your Code

```typescript
import { buildPrompt } from './src/intent-library-loader';

const prompt = buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Strategic planning',
  'llama3',
  'Planning 2026 company strategy'
);

console.log(prompt);
```

## Example Test Cases

### Test 1: Executive & Strategy
```typescript
buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Strategic planning',
  'llama3',
  'Planning Q2 2024 strategy'
);
```

### Test 2: Engineering & Technical
```typescript
buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Code generation',
  'codellama',
  'Generate REST API for authentication'
);
```

### Test 3: Product Management
```typescript
buildPrompt(
  'Intent_Library_Ollama_Enterprise_Ready.xlsx',
  'Requirements definition',
  'mistral',
  'Define mobile app requirements'
);
```

## Common Intents to Test

- `Strategic planning`
- `Decision making`
- `Code generation`
- `Requirements definition`
- `Risk assessment`
- `Lead qualification`
- `Budget planning`
- `Contract review`

See USAGE_EXAMPLES.md for the complete list of available intents.
