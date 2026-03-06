"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const server_1 = require("./server");
const port = Number(process.env.PORT || 7000);
const openapiPath = path_1.default.resolve(__dirname, "../openapi.yaml");
const app = (0, server_1.createServer)(openapiPath);
app.listen({ port, host: "0.0.0.0" }).then(() => {
    app.log.info("simulation engine listening on " + port);
});
