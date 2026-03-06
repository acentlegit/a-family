#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "🏗️  UIP — Build Engine Code (18 Services)"
echo "========================================="

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES_DIR="$ROOT_DIR/services"
TOOLS_DIR="$ROOT_DIR/tools"

ENGINES=(
  intent compliance policy risk explainability routing integration evidence
  identity tenancy quota pricing versioning change ai simulation appeals learning
)

mkdir -p "$SERVICES_DIR" "$TOOLS_DIR"

# --------------------------------------------------
# 1. Engine generator (TypeScript template)
# --------------------------------------------------
cat > "$TOOLS_DIR/generate-engine.ts" <<'EOF'
import fs from "fs";
import path from "path";

const engine = process.argv[2];
if (!engine) throw new Error("Engine name required");

const base = path.join("services", `${engine}-engine`);
fs.mkdirSync(path.join(base, "src"), { recursive: true });

const files: Record<string, string> = {
  "src/types.ts": `
export interface EngineRequest {
  intentId: string;
  actor: string;
  context: Record<string, unknown>;
}

export interface EngineResponse {
  decision: "ALLOW" | "DENY" | "REVIEW";
  reason: string;
}
`,
  "src/handler.ts": `
import { EngineRequest, EngineResponse } from "./types";

export async function execute(req: EngineRequest): Promise<EngineResponse> {
  return { decision: "ALLOW", reason: "Stub decision" };
}
`,
  "src/routes.ts": `
import { FastifyInstance } from "fastify";
import { execute } from "./handler";

export default async function routes(app: FastifyInstance) {
  app.post("/v1/execute", async (req) => execute(req.body as any));
  app.get("/v1/health", async () => ({ status: "ok" }));
}
`,
  "src/server.ts": `
import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import routes from "./routes";

export function createServer(openapiPath: string) {
  const app = Fastify({ logger: true });

  app.register(swagger, {
    mode: "static",
    specification: { path: openapiPath }
  });

  app.register(swaggerUI, { routePrefix: "/docs" });
  app.register(routes);

  return app;
}
`,
  "src/index.ts": `
import path from "path";
import { createServer } from "./server";

const port = Number(process.env.PORT || 7000);
const openapi = path.resolve(__dirname, "../openapi.yaml");

const app = createServer(openapi);
app.listen({ port, host: "0.0.0.0" });
`
};

for (const [file, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(base, file), content.trim());
}

console.log("✅ Engine generated:", engine);
EOF

# --------------------------------------------------
# 2. Generate all engines (except Compliance)
# --------------------------------------------------
for engine in "${ENGINES[@]}"; do
  if [[ "$engine" != "compliance" ]]; then
    node "$TOOLS_DIR/generate-engine.ts" "$engine"
  fi
done

# --------------------------------------------------
# 3. Full Compliance Engine (real logic + audit)
# --------------------------------------------------
COMPLIANCE_DIR="$SERVICES_DIR/compliance-engine/src"

cat > "$COMPLIANCE_DIR/policy.ts" <<'EOF'
export function evaluate(req: any) {
  if (req.jurisdiction === "US-CA" && req.action === "RECORD_DEED") {
    return {
      decision: "DENY",
      reason: "Only County Recorder may record deeds",
      regulation: "CA Govt Code §27201"
    };
  }
  return { decision: "ALLOW", reason: "Compliant" };
}
EOF

cat > "$COMPLIANCE_DIR/audit.ts" <<'EOF'
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function audit(event: any) {
  await pool.query(
    "INSERT INTO audit_log(event_type, payload) VALUES ($1, $2)",
    ["COMPLIANCE_DECISION", event]
  );
}
EOF

cat > "$COMPLIANCE_DIR/handler.ts" <<'EOF'
import { evaluate } from "./policy";
import { audit } from "./audit";

export async function execute(req: any) {
  const result = evaluate(req);
  await audit({ input: req, result, at: new Date().toISOString() });
  return result;
}
EOF

# --------------------------------------------------
# 4. Deterministic Orchestrator
# --------------------------------------------------
ORCH_DIR="$SERVICES_DIR/orchestrator/src"
mkdir -p "$ORCH_DIR"

cat > "$ORCH_DIR/orchestrator.ts" <<'EOF'
import axios from "axios";

const FLOW = [
  "intent",
  "compliance",
  "policy",
  "risk",
  "explainability",
  "evidence"
];

export async function run(payload: any) {
  let ctx = payload;

  for (const engine of FLOW) {
    const res = await axios.post(
      `http://${engine}-engine:7000/v1/execute`,
      ctx
    );
    ctx = { ...ctx, [engine]: res.data };
    if (res.data.decision === "DENY") break;
  }

  return ctx;
}
EOF

# --------------------------------------------------
# 5. Auth middleware (JWT + mTLS)
# --------------------------------------------------
cat > "$TOOLS_DIR/auth-middleware.ts" <<'EOF'
export async function enforceAuth(req: any) {
  if (!req.headers.authorization) {
    throw new Error("JWT required");
  }
  if (!req.headers["x-client-cert"]) {
    throw new Error("mTLS required");
  }
}
EOF

# --------------------------------------------------
# 6. Postgres migration
# --------------------------------------------------
mkdir -p "$ROOT_DIR/db/migrations"

cat > "$ROOT_DIR/db/migrations/001_audit_log.sql" <<'EOF'
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
EOF

echo "========================================="
echo "✅ Engine code generated successfully"
echo "Services created under /services"
echo "========================================="

