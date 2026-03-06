"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = routes;
const handler_1 = require("./handler");
const ollama_service_1 = require("./ollama-service");
async function routes(app) {
    app.get("/v1/health", async () => ({ status: "ok" }));
    app.post("/v1/execute", async (req) => {
        return (0, handler_1.execute)(req.body);
    });
    // Test endpoint to verify Ollama integration
    app.post("/v1/test-ollama", async (req) => {
        const { intent, industry = "generic" } = req.body;
        if (!intent) {
            return { error: "Intent text required" };
        }
        console.log("[Test] Testing Ollama with intent:", intent);
        const testResult = {
            decision: "ALLOW",
            reason: "Test default"
        };
        try {
            const enhanced = await (0, ollama_service_1.generateEngineResponse)('compliance', intent, industry, {}, testResult);
            return {
                original: testResult,
                enhanced: enhanced,
                ollamaWorking: enhanced.ollamaEnhanced === true,
                response: enhanced.reason || enhanced.why || "No response"
            };
        }
        catch (error) {
            return {
                error: error.message,
                stack: error.stack,
                ollamaWorking: false
            };
        }
    });
    // Admin API endpoints
    app.get("/admin/engines", async () => {
        const engines = [
            "intent-engine",
            "compliance-engine",
            "policy-engine",
            "risk-engine",
            "explainability-engine",
            "evidence-engine",
            "appeals-engine",
            "routing-engine",
            "integration-engine",
            "identity-engine",
            "tenancy-engine",
            "quota-engine",
            "pricing-engine",
            "versioning-engine",
            "change-engine",
            "ai-engine",
            "simulation-engine",
            "learning-engine"
        ];
        return engines;
    });
    app.get("/admin/reports/changes", async () => {
        // Return audit log of changes
        return {
            changes: [],
            timestamp: new Date().toISOString(),
            message: "Audit log endpoint - would return change history in production"
        };
    });
}
