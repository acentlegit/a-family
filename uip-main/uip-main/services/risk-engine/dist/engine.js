"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessRisk = assessRisk;
function assessRisk(intent) {
    let score = 0;
    if (intent.payload?.amount && intent.payload.amount > 100000)
        score += 5;
    if (intent.payload?.irreversible)
        score += 5;
    const level = score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
    return { score, level };
}
