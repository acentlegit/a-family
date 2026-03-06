#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "📦 UIP — Create @uip/core package"
echo "========================================="

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE="$ROOT/packages/core"

mkdir -p "$CORE/src"

# package.json
cat > "$CORE/package.json" <<'EOF'
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

# tsconfig.json
cat > "$CORE/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true,
    "declaration": true
  },
  "include": ["src"]
}
EOF

# Intent type
cat > "$CORE/src/index.ts" <<'EOF'
export interface IntentPayload {
  amount?: number;
  irreversible?: boolean;
  zoning?: string;
  controlled?: boolean;
}

export interface Intent {
  id?: string;
  industry: string;
  action?: string;
  payload?: IntentPayload;
  metadata?: Record<string, unknown>;
}
EOF

echo "✅ @uip/core created"

echo "========================================="
echo "➡️  Next:"
echo "   npm install"
echo "   npm run build --workspaces"
echo "========================================="

