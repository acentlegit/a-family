#!/usr/bin/env bash
set -e

echo "========================================="
echo "🛠  UIP — Fix Workspaces + Build Engines"
echo "========================================="

# -------------------------------
# 1. Ensure root package.json has workspaces
# -------------------------------
if ! grep -q '"workspaces"' package.json; then
  echo "❌ Root package.json has no workspaces. Aborting."
  exit 1
fi

if ! grep -q 'packages/\*' package.json; then
  echo "📦 Adding packages/* to root workspaces..."

  node <<'EOF'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

pkg.workspaces = Array.from(new Set([
  ...(pkg.workspaces || []),
  "packages/*",
  "services/*"
]));

fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
EOF
else
  echo "✔ packages/* already in workspaces"
fi

# -------------------------------
# 2. Ensure @uip/core exists
# -------------------------------
if [ ! -d "packages/core" ]; then
  echo "📦 Creating @uip/core..."

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
# 3. Install dependencies once
# -------------------------------
echo "📦 Installing dependencies..."
npm install

# -------------------------------
# 4. Build core explicitly
# -------------------------------
echo "🔧 Building @uip/core..."
npm run build -w @uip/core

# -------------------------------
# 5. Build all engines
# -------------------------------
echo "🏗️  Building all engines..."
npm run build --workspaces --if-present

echo "========================================="
echo "✅ UIP — All engines built successfully"
echo "========================================="

