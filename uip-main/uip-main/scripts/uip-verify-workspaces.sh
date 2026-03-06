#!/usr/bin/env bash
set -e

echo "🔎 Verifying UIP workspace build..."

npm run build

for dir in services/*-engine; do
  if [[ ! -d "$dir/dist" ]]; then
    echo "❌ Missing build output in $dir"
    exit 1
  fi
done

echo "✅ All 18 engines built successfully"

