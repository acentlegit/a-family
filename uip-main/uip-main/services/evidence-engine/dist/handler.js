"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
const crypto_1 = __importDefault(require("crypto"));
const core_1 = require("@uip/core");
async function execute(req) {
    const industry = (0, core_1.detectIndustry)(req);
    const payload = JSON.stringify(req);
    const hash = crypto_1.default
        .createHash("sha256")
        .update(payload)
        .digest("hex");
    // Generate evidence records based on industry
    const evidenceRecords = [];
    if (industry === "real-estate") {
        evidenceRecords.push({ item: "Appraisal Report", status: "✓" }, { item: "Inspection Report", status: "✓" }, { item: "Mortgage Commitment", status: "✓" }, { item: "Deed", status: req.deedSigned ? "✓" : "✖" });
    }
    else if (industry === "healthcare") {
        evidenceRecords.push({ item: "Physician Order", status: "✓" }, { item: "Lab Results", status: "✓" }, { item: "Insurance Policy", status: "✓" }, { item: "Patient Consent", status: "✓" });
    }
    else if (industry === "finance") {
        evidenceRecords.push({ item: "Customer KYC", status: "✓" }, { item: "Source of Funds", status: "✓" }, { item: "Transaction History", status: "✓" }, { item: "Regulatory Clearance", status: req.amlCleared ? "✓" : "✖" });
    }
    else if (industry === "automobile") {
        evidenceRecords.push({ item: "Title Certificate", status: "✓" }, { item: "Bill of Sale", status: "✓" }, { item: "Loan Agreement", status: "✓" }, { item: "Emissions Clearance", status: req.emissionsFailed ? "✖" : "✓" }, { item: "Safety Inspection", status: req.safetyRecall ? "✖" : "✓" });
    }
    else if (industry === "manufacturing") {
        evidenceRecords.push({ item: "Production Plan", status: "✓" }, { item: "Quality Certification", status: "✓" }, { item: "Safety Compliance", status: req.safetyViolation ? "✖" : "✓" }, { item: "Export License", status: req.exportRestricted ? "✖" : "✓" });
    }
    else if (industry === "retail") {
        evidenceRecords.push({ item: "Transaction Record", status: "✓" }, { item: "Customer Verification", status: "✓" }, { item: "Fraud Check", status: req.fraudFlag ? "✖" : "✓" }, { item: "Refund Policy Compliance", status: req.refundPolicyViolation ? "✖" : "✓" });
    }
    else if (industry === "education") {
        evidenceRecords.push({ item: "Student Consent", status: "✓" }, { item: "FERPA Compliance", status: req.ferpaViolation ? "✖" : "✓" }, { item: "Authorization", status: req.unauthorizedAccess ? "✖" : "✓" }, { item: "Record Verification", status: "✓" });
    }
    else if (industry === "communications") {
        evidenceRecords.push({ item: "Content Review", status: "✓" }, { item: "Privacy Compliance", status: req.privacyViolation ? "✖" : "✓" }, { item: "FCC Compliance", status: req.contentViolation ? "✖" : "✓" }, { item: "Legal Authorization", status: "✓" });
    }
    return {
        evidenceHash: hash,
        algorithm: "SHA-256",
        timestamp: new Date().toISOString(),
        industry,
        records: evidenceRecords,
        valid: evidenceRecords.every(r => r.status === "✓")
    };
}
