#!/usr/bin/env bash
set -e

echo "========================================="
echo "🛠  UIP — Fix Core + Build All Engines"
echo "========================================="

ROOT_DIR=$(pwd)

# -------------------------------
# 1. Ensure @uip/core exists
# -------------------------------
if [ ! -d "packages/core" ]; then
  echo "📦 Creating @uip/core package..."

  mkdir -p packages/core/src

  cat > packages/core/package.json <<'EOF'
{
  "name": "@uip/core",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
EOF

  cat > packages/core/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "module": "CommonJS",
    "target": "ES2020",
    "strict": true
  },
  "include": ["src"]
}
EOF

  cat > packages/core/src/index.ts <<'EOF'
export interface Intent {
  id: string;
  industry: string;
  action: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface EngineResult {
  decision: "ALLOW" | "DENY" | "REVIEW";
  score?: number;
  reason?: string;
}
EOF
else
  echo "✔ @uip/core already exists"
fi

# -------------------------------
# 2. Install dependencies
# -------------------------------
echo "📦 Installing dependencies..."
npm install

# -------------------------------
# 3. Build core first
# -------------------------------
echo "🔧 Building @uip/core..."
npm run build --workspace @uip/core

# -------------------------------
# 4. Build all engines
# -------------------------------
echo "🏗️  Building all engines..."
npm run build --workspaces --if-present

echo "========================================="
echo "✅ UIP build completed successfully"
echo "========================================="

