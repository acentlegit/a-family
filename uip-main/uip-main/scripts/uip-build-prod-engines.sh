#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "🏗️  UIP — Build Production Engines"
echo "========================================="

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES="$ROOT/services"
K8S="$ROOT/k8s/templates"

mkdir -p "$SERVICES/_engine-template" "$K8S"

# --------------------------------------------------
# 1. Dockerfile template (all engines)
# --------------------------------------------------
cat > "$SERVICES/_engine-template/Dockerfile" <<'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 7000
CMD ["node", "dist/index.js"]
EOF

# --------------------------------------------------
# 2. Kubernetes templates
# --------------------------------------------------
cat > "$K8S/engine-deployment.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ENGINE}}-engine
spec:
  replicas: 2
  selector:
    matchLabels:
      app: {{ENGINE}}-engine
  template:
    metadata:
      labels:
        app: {{ENGINE}}-engine
    spec:
      containers:
        - name: {{ENGINE}}-engine
          image: acentlegit/uip-{{ENGINE}}:v1
          ports:
            - containerPort: 7000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: uip-db
                  key: url
EOF

cat > "$K8S/engine-service.yaml" <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: {{ENGINE}}-engine
spec:
  selector:
    app: {{ENGINE}}-engine
  ports:
    - port: 7000
      targetPort: 7000
EOF

# --------------------------------------------------
# 3. Policy Engine (full implementation)
# --------------------------------------------------
mkdir -p "$SERVICES/policy-engine/src"

cat > "$SERVICES/policy-engine/src/handler.ts" <<'EOF'
export async function execute(req: any) {
  const { actorRole, action, delegation } = req;

  if (action === "APPROVE_DEED" && actorRole !== "COUNTY_RECORDER") {
    return {
      decision: "DENY",
      reason: "Only County Recorder may approve deeds"
    };
  }

  if (delegation?.expired === true) {
    return {
      decision: "DENY",
      reason: "Delegation expired"
    };
  }

  return {
    decision: "ALLOW",
    reason: "Policy authorization successful"
  };
}
EOF

# --------------------------------------------------
# 4. Risk Engine (deterministic scoring)
# --------------------------------------------------
mkdir -p "$SERVICES/risk-engine/src"

cat > "$SERVICES/risk-engine/src/handler.ts" <<'EOF'
export async function execute(req: any) {
  let score = 0;

  if (req.action === "TRANSFER_PROPERTY") score += 40;
  if (req.amount && req.amount > 1000000) score += 30;
  if (req.actorTrustLevel === "LOW") score += 30;

  let level = "LOW";
  if (score >= 70) level = "HIGH";
  else if (score >= 40) level = "MEDIUM";

  return {
    riskScore: score,
    riskLevel: level,
    decision: level === "HIGH" ? "REVIEW" : "ALLOW",
    reason: "Deterministic risk score"
  };
}
EOF

# --------------------------------------------------
# 5. Evidence Engine (cryptographic hashing)
# --------------------------------------------------
mkdir -p "$SERVICES/evidence-engine/src"

cat > "$SERVICES/evidence-engine/src/handler.ts" <<'EOF'
import crypto from "crypto";

export async function execute(req: any) {
  const payload = JSON.stringify(req);

  const hash = crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");

  return {
    evidenceHash: hash,
    algorithm: "SHA-256",
    timestamp: new Date().toISOString()
  };
}
EOF

echo "========================================="
echo "✅ Production engine code generated"
echo "========================================="

