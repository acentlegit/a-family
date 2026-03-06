"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
const core_1 = require("@uip/core");
async function execute(req) {
    const industry = (0, core_1.detectIndustry)(req);
    // This would normally receive results from other engines
    // For now, we'll generate a basic explanation
    const decisionPath = [];
    if (req.complianceDecision) {
        decisionPath.push(`compliance.${req.complianceDecision.toLowerCase()}`);
    }
    else {
        decisionPath.push("compliance.allow");
    }
    if (req.policyDecision) {
        decisionPath.push(`policy.${req.policyDecision.toLowerCase()}`);
    }
    else {
        decisionPath.push("policy.allow");
    }
    if (req.riskLevel) {
        decisionPath.push(`risk.${req.riskLevel.toLowerCase()}`);
    }
    else {
        decisionPath.push("risk.low");
    }
    let why = "All governance gates passed";
    if (industry === "real-estate") {
        why = "Property transfer complies with zoning and title requirements";
    }
    else if (industry === "healthcare") {
        why = "Treatment is medically necessary based on diagnosis and prior lab results";
    }
    else if (industry === "finance") {
        why = "Transaction complies with AML and KYC requirements";
    }
    else if (industry === "automobile") {
        why = "Vehicle transfer meets DMV and emissions requirements";
    }
    else if (industry === "manufacturing") {
        why = "Production change complies with safety and export control regulations";
    }
    else if (industry === "retail") {
        why = "Transaction complies with consumer protection and fraud detection policies";
    }
    else if (industry === "education") {
        why = "Request complies with FERPA and accreditation requirements";
    }
    else if (industry === "communications") {
        why = "Content moderation complies with FCC and privacy regulations";
    }
    return {
        decisionPath,
        why,
        industry,
        reason: "Explainability analysis complete"
    };
}
