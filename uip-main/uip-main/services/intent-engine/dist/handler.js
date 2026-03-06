"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
const orchestrator_1 = require("./orchestrator");
async function execute(req) {
    try {
        // Use orchestrator for full intent evaluation
        const result = await (0, orchestrator_1.orchestrateIntent)(req);
        return result;
    }
    catch (error) {
        // Fallback to simple processing if orchestrator fails
        return {
            intentId: `INT-${Date.now()}`,
            industry: req.industry || "real-estate",
            status: "RECEIVED",
            decision: "ALLOW",
            reason: `Intent received: ${error.message}`
        };
    }
}
