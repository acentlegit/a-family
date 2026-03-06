#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo "🧩 UIP — Fill Missing Engine Service Code"
echo "========================================="

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES="$ROOT/services"
OPENAPI="$ROOT/openapi"

ENGINES=(
  intent compliance policy risk explainability routing integration evidence
  identity tenancy quota pricing versioning change ai simulation appeals learning
)

mkdir -p "$SERVICES"

# Shared package.json template for each engine
write_pkg () {
  local dir="$1"
  cat > "$dir/package.json" <<'EOF'
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
}

# Shared tsconfig.json template
write_tsconfig () {
  local dir="$1"
  cat > "$dir/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
EOF
}

# Shared server.ts
write_server () {
  local dir="$1"
  cat > "$dir/src/server.ts" <<'EOF'
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
EOF
}

# Shared routes.ts
write_routes () {
  local dir="$1"
  cat > "$dir/src/routes.ts" <<'EOF'
import { FastifyInstance } from "fastify";
import { execute } from "./handler";

export default async function routes(app: FastifyInstance) {
  app.get("/v1/health", async () => ({ status: "ok" }));

  app.post("/v1/execute", async (req) => {
    return execute(req.body as any);
  });
}
EOF
}

# Shared index.ts
write_index () {
  local dir="$1"
  local engine="$2"
  cat > "$dir/src/index.ts" <<EOF
import path from "path";
import { createServer } from "./server";

const port = Number(process.env.PORT || 7000);
const openapiPath = path.resolve(__dirname, "../openapi.yaml");

const app = createServer(openapiPath);

app.listen({ port, host: "0.0.0.0" }).then(() => {
  app.log.info("${engine} engine listening on " + port);
});
EOF
}

# Stub handler.ts (unless exists)
write_stub_handler_if_missing () {
  local dir="$1"
  if [[ ! -f "$dir/src/handler.ts" ]]; then
    cat > "$dir/src/handler.ts" <<'EOF'
export async function execute(req: any) {
  return {
    decision: "ALLOW",
    reason: "Stub engine response"
  };
}
EOF
  fi
}

# Write openapi.yaml pointer file (engine local) so swagger works
write_openapi_pointer () {
  local dir="$1"
  local engine="$2"
  # engine-level openapi.yaml will be a copy of repo root spec if present
  local src1="$OPENAPI/${engine}.yaml"
  local src2="$OPENAPI/${engine}.openapi.yaml"

  if [[ -f "$src1" ]]; then
    cp "$src1" "$dir/openapi.yaml"
  elif [[ -f "$src2" ]]; then
    cp "$src2" "$dir/openapi.yaml"
  else
    # Create minimal valid spec if truly missing (should be rare)
    cat > "$dir/openapi.yaml" <<EOF
openapi: 3.1.0
info:
  title: ${engine^} Engine API
  version: 1.0.0
paths:
  /v1/health:
    get:
      responses:
        "200":
          description: OK
  /v1/execute:
    post:
      responses:
        "200":
          description: OK
EOF
  fi
}

echo "🛠️  Creating runnable service skeletons..."
for engine in "${ENGINES[@]}"; do
  dir="$SERVICES/${engine}-engine"
  mkdir -p "$dir/src"

  write_pkg "$dir"
  write_tsconfig "$dir"
  write_server "$dir"
  write_routes "$dir"
  write_index "$dir" "$engine"
  write_stub_handler_if_missing "$dir"
  write_openapi_pointer "$dir" "$engine"
done

echo "✅ Engine skeletons ensured for all 18."

echo ""
echo "Next:"
echo "  (1) Install deps once at repo root (if using workspaces) OR per-service:"
echo "      cd services/policy-engine && npm install && npm run build"
echo "  (2) Run:"
echo "      node services/policy-engine/dist/index.js"
echo "========================================="

