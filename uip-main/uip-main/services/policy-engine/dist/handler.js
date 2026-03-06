"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
const core_1 = require("@uip/core");
async function execute(req) {
    const industry = (0, core_1.detectIndustry)(req);
    const { actorRole, action, intent, delegation } = req;
    const act = action || intent;
    // Real Estate Policy
    if (industry === "real-estate") {
        if (act === "APPROVE_DEED" && actorRole !== "COUNTY_RECORDER") {
            return {
                decision: "DENY",
                authority: "policy-engine",
                references: ["policy-real-estate-001"],
                reason: "Only County Recorder may approve deeds"
            };
        }
        if (delegation?.expired === true) {
            return {
                decision: "DENY",
                authority: "policy-engine",
                references: ["policy-delegation"],
                reason: "Delegation expired"
            };
        }
        return {
            decision: "ALLOW",
            authority: "policy-engine",
            references: ["policy-17"],
            reason: "Authorized"
        };
    }
    // Healthcare Policy
    if (industry === "healthcare") {
        if (actorRole && !["PHYSICIAN", "PAYER", "CLINIC"].includes(actorRole)) {
            return {
                decision: "DENY",
                authority: "policy-engine",
                references: ["policy-healthcare-001"],
                reason: "Insufficient role for treatment authorization"
            };
        }
        return {
            decision: "ALLOW",
            authority: "policy-engine",
            references: ["policy-healthcare-002"],
            reason: "Authorized"
        };
    }
    // Finance Policy
    if (industry === "finance") {
        if (actorRole && actorRole !== "BANK_COMPLIANCE" && act === "AUTHORIZE_TRANSFER") {
            return {
                decision: "DENY",
                authority: "policy-engine",
                references: ["policy-finance-001"],
                reason: "Only bank compliance may authorize large transfers"
            };
        }
        return {
            decision: "ALLOW",
            authority: "policy-engine",
            references: ["policy-finance-002"],
            reason: "Authorized"
        };
    }
    // Automobile Policy
    if (industry === "automobile") {
        if (act === "TRANSFER_OWNERSHIP" && actorRole && !["DMV_OFFICER", "DEALER"].includes(actorRole)) {
            return {
                decision: "DENY",
                authority: "policy-engine",
                references: ["policy-automobile-001"],
                reason: "Only DMV officers or licensed dealers may transfer ownership"
            };
        }
        return {
            decision: "ALLOW",
            authority: "policy-engine",
            references: ["policy-automobile-002"],
            reason: "Authorized"
        };
    }
    // Manufacturing Policy
    if (industry === "manufacturing") {
        if (act === "PRODUCTION_CHANGE" && actorRole && !["PRODUCTION_MANAGER", "QUALITY_OFFICER"].includes(actorRole)) {
            return {
                decision: "DENY",
                authority: "policy-engine",
                references: ["policy-manufacturing-001"],
                reason: "Only production managers or quality officers may authorize production changes"
            };
        }
        return {
            decision: "ALLOW",
            authority: "policy-engine",
            references: ["policy-manufacturing-002"],
            reason: "Authorized"
        };
    }
    // Retail Policy
    if (industry === "retail") {
        if (act === "REFUND_APPROVAL" && actorRole && !["STORE_MANAGER", "CUSTOMER_SERVICE"].includes(actorRole)) {
            return {
                decision: "DENY",
                authority: "policy-engine",
                references: ["policy-retail-001"],
                reason: "Only store managers or customer service may approve refunds"
            };
        }
        return {
            decision: "ALLOW",
            authority: "policy-engine",
            references: ["policy-retail-002"],
            reason: "Authorized"
        };
    }
    // Education Policy
    if (industry === "education") {
        if (act === "TRANSCRIPT_RELEASE" && actorRole && !["REGISTRAR", "ADMIN"].includes(actorRole)) {
            return {
                decision: "DENY",
                authority: "policy-engine",
                references: ["policy-education-001"],
                reason: "Only registrar or admin may release transcripts"
            };
        }
        return {
            decision: "ALLOW",
            authority: "policy-engine",
            references: ["policy-education-002"],
            reason: "Authorized"
        };
    }
    // Communications Policy
    if (industry === "communications") {
        if (act === "CONTENT_MODERATION" && actorRole && !["MODERATOR", "ADMIN"].includes(actorRole)) {
            return {
                decision: "DENY",
                authority: "policy-engine",
                references: ["policy-communications-001"],
                reason: "Only moderators or admins may moderate content"
            };
        }
        return {
            decision: "ALLOW",
            authority: "policy-engine",
            references: ["policy-communications-002"],
            reason: "Authorized"
        };
    }
    // Default
    return {
        decision: "ALLOW",
        authority: "policy-engine",
        references: ["policy-17"],
        reason: "Policy authorization successful"
    };
}
