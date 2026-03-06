"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const fastify_1 = __importDefault(require("fastify"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const ws_1 = require("ws");
const routes_1 = __importDefault(require("./routes"));
function createServer(openapiPath) {
    const app = (0, fastify_1.default)({ logger: true });
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
    app.register(swagger_1.default, {
        mode: "static",
        specification: { path: openapiPath, baseDir: __dirname }
    });
    app.register(swagger_ui_1.default, { routePrefix: "/docs" });
    app.register(routes_1.default);
    const wss = new ws_1.WebSocketServer({ server: app.server });
    const broadcast = (payload) => {
        const msg = JSON.stringify(payload);
        for (const client of wss.clients) {
            if (client.readyState === 1)
                client.send(msg);
        }
    };
    app.broadcast = broadcast;
    return app;
}
