#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "🔧 UIP — Normalize All 18 Engines"
echo "========================================="

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES="$ROOT/services"

ENGINES=(
  intent compliance policy risk explainability routing integration evidence
  identity tenancy quota pricing versioning change ai simulation appeals learning
)

echo "➡️  Ensuring @types/node is installed (root)"
npm install --save-dev @types/node >/dev/null 2>&1 || true

echo "➡️  Updating tsconfig.json for Node environment"
if [[ ! -f "$ROOT/tsconfig.json" ]]; then
cat > "$ROOT/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF
fi

for engine in "${ENGINES[@]}"; do
  DIR="$SERVICES/${engine}-engine"
  SRC="$DIR/src"

  echo "➡️  Normalizing ${engine}-engine"

  # --- Fix Swagger registration ---
  if [[ -f "$SRC/server.ts" ]]; then
    sed -i '' 's/specification: { *path: *openapiPath *}/specification: { path: openapiPath, baseDir: __dirname }/g' "$SRC/server.ts"
  fi

  # --- Ensure tsconfig exists ---
  if [[ ! -f "$DIR/tsconfig.json" ]]; then
cat > "$DIR/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
EOF
  fi

  # --- Fix shared Intent imports ---
  find "$SRC" -type f -name "*.ts" -exec sed -i '' \
    's|../../../packages/core/intent|@uip/core|g' {} +

done

echo "========================================="
echo "✅ Engines normalized"
echo "➡️  Run next:"
echo "   npm install"
echo "   npm run build --workspaces"
echo "========================================="

