"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulate = simulate;
function simulate(intent, scenarios) {
    return scenarios.map(s => ({
        scenario: s.name,
        projectedOutcome: s.assumption === "RELAXED" ? "ALLOW" : "DENY",
        riskDelta: Math.random().toFixed(2)
    }));
}
