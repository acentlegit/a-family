"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explain = explain;
function explain(intent, engineResults) {
    return {
        intentId: intent.id,
        explanation: engineResults.map(r => `${r.engine}: ${r.outcome}${r.reason ? " - " + r.reason : ""}`).join("\n"),
        audience: ["USER", "REGULATOR", "AUDITOR"]
    };
}
