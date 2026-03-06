"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateCompliance = evaluateCompliance;
function evaluateCompliance(intent) {
    if (intent.industry === "REAL_ESTATE" && intent.payload?.zoning === "ILLEGAL") {
        return { outcome: "DENY", reason: "Zoning violation under municipal code" };
    }
    if (intent.industry === "PHARMACY" && intent.payload?.controlled === true) {
        return { outcome: "DENY", reason: "Controlled substance restriction" };
    }
    return { outcome: "ALLOW" };
}
