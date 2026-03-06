#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "📦 UIP — Normalize Engine package.json"
echo "========================================="

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES="$ROOT/services"

ENGINES=(
  intent compliance policy risk explainability routing integration evidence
  identity tenancy quota pricing versioning change ai simulation appeals learning
)

for engine in "${ENGINES[@]}"; do
  DIR="$SERVICES/${engine}-engine"
  mkdir -p "$DIR"

  cat > "$DIR/package.json" <<'EOF'
{
  "name": "uip-engine",
  "private": true,
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "fastify": "^4.27.0",
    "@fastify/swagger": "^8.15.0",
    "@fastify/swagger-ui": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "tsx": "^4.16.2"
  }
}
EOF

  echo "✅ package.json written for ${engine}-engine"
done

echo "========================================="
echo "✅ All engine package.json files normalized"
echo "========================================="

