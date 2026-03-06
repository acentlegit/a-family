const fs = require("fs");
const path = require("path");

const engine = process.argv[2];
if (!engine) {
  console.error("❌ Engine name required");
  process.exit(1);
}

const base = path.join(__dirname, "..", "services", `${engine}-engine`);
fs.mkdirSync(path.join(base, "src"), { recursive: true });

const files = {
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

console.log(`✅ Engine generated: ${engine}`);

