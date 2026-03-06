#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "🧩 UIP — Fix Workspace Package Names"
echo "========================================="

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES="$ROOT/services"

ENGINES=(
  intent compliance policy risk explainability routing integration evidence
  identity tenancy quota pricing versioning change ai simulation appeals learning
)

for engine in "${ENGINES[@]}"; do
  DIR="$SERVICES/${engine}-engine"

  cat > "$DIR/package.json" <<EOF
{
  "name": "@uip/${engine}-engine",
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

  echo "✅ @uip/${engine}-engine"
done

echo "========================================="
echo "✅ Workspace names fixed"
echo "========================================="

