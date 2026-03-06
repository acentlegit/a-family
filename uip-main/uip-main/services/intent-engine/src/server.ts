import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { WebSocketServer } from "ws";
import routes from "./routes";

export function createServer(openapiPath: string) {
  const app = Fastify({ logger: true });

  // Add CORS headers manually
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') {
      reply.code(200).send();
    }
  });

  app.register(swagger as any, {
    mode: "static",
    specification: { path: openapiPath, baseDir: __dirname }
  });

  app.register(swaggerUI as any, { routePrefix: "/docs" });
  app.register(routes);

  const wss = new WebSocketServer({ server: app.server });
  const broadcast = (payload: any) => {
    const msg = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(msg);
    }
  };

  (app as any).broadcast = broadcast;

  return app;
}
