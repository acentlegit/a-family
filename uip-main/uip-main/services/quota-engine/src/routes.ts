import { FastifyInstance } from "fastify";
import { execute } from "./handler";

export default async function routes(app: FastifyInstance) {
  app.get("/v1/health", async () => ({ status: "ok" }));

  app.post("/v1/execute", async (req) => {
    return execute(req.body as any);
  });
}
