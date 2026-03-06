"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = routes;
const handler_1 = require("./handler");
async function routes(app) {
    app.get("/v1/health", async () => ({ status: "ok" }));
    app.post("/v1/execute", async (req) => {
        return (0, handler_1.execute)(req.body);
    });
}
