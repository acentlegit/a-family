#!/usr/bin/env bash
set -e

echo "========================================="
echo "🧩 UIP — Normalize Intent Contract (FINAL)"
echo "========================================="

CORE_FILE="packages/core/src/index.ts"

if [ ! -f "$CORE_FILE" ]; then
  echo "❌ Cannot find $CORE_FILE"
  exit 1
fi

echo "✏️  Rewriting Intent interface (safe overwrite)..."

node <<'EOF'
const fs = require("fs");

const file = "packages/core/src/index.ts";
let src = fs.readFileSync(file, "utf8");

// Remove any existing Intent interface completely
src = src.replace(
  /export interface Intent\s*{[\s\S]*?}\s*/g,
  ""
);

// Append clean canonical Intent
src += `

export interface Intent {
  id: string;
  type?: "EXECUTE" | "EVALUATE" | "SIMULATE";
  industry?: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}
`;

fs.writeFileSync(file, src.trim() + "\n");
EOF

# -----------------------------------
# Rebuild core
# -----------------------------------
echo "🔧 Rebuilding @uip/core..."
npm run build -w @uip/core

# -----------------------------------
# Rebuild all engines
# -----------------------------------
echo "🏗️  Rebuilding all engines..."
npm run build --workspaces --if-present

echo "========================================="
echo "✅ Intent contract normalized successfully"
echo "========================================="
