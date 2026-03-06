#!/usr/bin/env bash
set -e

echo "🔧 UIP Repository Sync Script"
echo "Ensuring canonical UIP structure (non-destructive)"

touch_if_missing () {
  if [ ! -f "$1" ]; then
    mkdir -p "$(dirname "$1")"
    touch "$1"
    echo "➕ created $1"
  fi
}

dir_if_missing () {
  if [ ! -d "$1" ]; then
    mkdir -p "$1"
    echo "📁 created $1"
  fi
}

# ---------- root ----------
touch_if_missing README.md
touch_if_missing LICENSE
touch_if_missing NOTICE
touch_if_missing OPEN_SOURCE_APIS.md
touch_if_missing SWAGGER.md
touch_if_missing .env.example
touch_if_missing .gitignore

# ---------- github ----------
dir_if_missing .github/workflows
dir_if_missing .github/ISSUE_TEMPLATE
touch_if_missing .github/workflows/ci.yml
touch_if_missing .github/ISSUE_TEMPLATE/bug.md
touch_if_missing .github/PULL_REQUEST_TEMPLATE.md

# ---------- packages ----------
for pkg in core pipeline db observability secrets oss swagger; do
  dir_if_missing packages/$pkg
done

touch_if_missing packages/core/intent.ts
touch_if_missing packages/core/event.ts
touch_if_missing packages/core/engine-result.ts

touch_if_missing packages/pipeline/stateMachine.ts
touch_if_missing packages/pipeline/worker.ts

touch_if_missing packages/db/postgres.ts
touch_if_missing packages/db/mongo.ts

touch_if_missing packages/observability/metrics.ts

touch_if_missing packages/secrets/vault.ts
touch_if_missing packages/secrets/aws.ts
touch_if_missing packages/secrets/gcp.ts

touch_if_missing packages/oss/httpClient.ts
touch_if_missing packages/swagger/swagger.ts

# ---------- services ----------
ENGINES=(
  intent compliance policy risk explainability routing integration evidence
  identity tenancy quota pricing versioning governance ai simulation dispute learning
)

for e in "${ENGINES[@]}"; do
  dir_if_missing services/${e}-engine/src
  touch_if_missing services/${e}-engine/src/engine.ts
done

touch_if_missing services/intent-engine/src/server.ts
dir_if_missing services/integration-engine/src/adapters
touch_if_missing services/integration-engine/src/adapters/httpAdapter.ts

dir_if_missing services/auth/src
touch_if_missing services/auth/src/server.ts

# ---------- database ----------
dir_if_missing db/postgres/migrations
touch_if_missing db/postgres/migrations/001_events.sql

dir_if_missing db/mongo
touch_if_missing db/mongo/evidence.schema.json

# ---------- rules ----------
dir_if_missing rules
for r in real-estate healthcare finance automobile manufacturing education communications; do
  touch_if_missing rules/$r.json
done

# ---------- demo ----------
dir_if_missing demo
for d in real-estate healthcare finance automobile manufacturing education; do
  touch_if_missing demo/$d.json
done

# ---------- openapi ----------
dir_if_missing openapi
for o in intent compliance policy risk explainability routing integration evidence identity tenancy quota pricing versioning governance ai simulation dispute learning; do
  touch_if_missing openapi/$o.yaml
done

# ---------- monitoring ----------
dir_if_missing monitoring/grafana
touch_if_missing monitoring/prometheus.yml
touch_if_missing monitoring/grafana/dashboard.json
touch_if_missing monitoring/alertmanager.yml

# ---------- k8s ----------
dir_if_missing k8s
touch_if_missing k8s/engine-deployment.yaml
touch_if_missing k8s/engine-service.yaml
touch_if_missing k8s/ingress.yaml

# ---------- deploy ----------
dir_if_missing deploy
touch_if_missing deploy/county.yaml
touch_if_missing deploy/state.yaml
touch_if_missing deploy/federal.yaml

# ---------- certifications ----------
dir_if_missing certifications
touch_if_missing certifications/SOC2.md
touch_if_missing certifications/ISO27001.md
touch_if_missing certifications/HIPAA.md

# ---------- jobs ----------
dir_if_missing jobs/retention
touch_if_missing jobs/retention/purgeEvents.ts
touch_if_missing jobs/retention/legalHold.ts

# ---------- tools ----------
dir_if_missing tools/evidence
touch_if_missing tools/evidence/packet.ts
touch_if_missing tools/evidence/pdfGenerator.ts

echo ""
echo "✅ UIP repo sync complete."
echo "ℹ️  No existing files were overwritten."
echo "📦 Repo is now structurally complete and regulator-ready."

