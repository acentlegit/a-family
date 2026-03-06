"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectIndustry = detectIndustry;
exports.getDomainRules = getDomainRules;
function detectIndustry(intent) {
    // If explicitly provided, use it
    if (intent.industry)
        return intent.industry;
    if (intent.domain)
        return intent.domain;
    // Auto-detect based on intent text (natural language)
    // Handle both structured intents and natural language
    // Check multiple fields where natural language text might be stored
    const intentText = (intent.intent?.toString() ||
        intent.payload?.intent ||
        intent.payload?.text ||
        intent.text ||
        intent.naturalLanguageIntent ||
        "");
    const intentStr = intentText.toUpperCase();
    const hasWord = (word) => new RegExp(`\\b${word}\\b`, "i").test(intentText);
    // Healthcare - Check BEFORE retail to avoid misclassification
    // Priority: dentist/dental/doctor/medical terms are very specific
    if (intentStr.includes("DENTIST") || intentStr.includes("DENTAL") ||
        intentStr.includes("CARDIOLOGY") || intentStr.includes("CARDIO") ||
        intentStr.includes("ROOT CANAL") ||
        (intentStr.includes("SCHEDULE") && (intentStr.includes("DENTAL") || intentStr.includes("DENTIST") || intentStr.includes("DOCTOR") || intentStr.includes("MEDICAL") || intentStr.includes("APPOINTMENT"))) ||
        intentStr.includes("DOCTOR") || intentStr.includes("MEDICAL") ||
        intentStr.includes("HOSPITAL") || intentStr.includes("CLINIC") ||
        intentStr.includes("TREATMENT") || intentStr.includes("PRESCRIPTION") ||
        intentStr.includes("PATIENT") || intentStr.includes("HEALTH") ||
        intentStr.includes("SEE A DOCTOR") || intentStr.includes("SEE A DENTIST") ||
        intentStr.includes("HEALTHCARE") || intentStr.includes("MEDICAL CARE") ||
        (intentStr.includes("INSURANCE") && (intentStr.includes("DENTAL") || intentStr.includes("HEALTH") || intentStr.includes("MEDICAL")))) {
        return "healthcare";
    }
    // Travel
    if (intentStr.includes("TRAVEL") || intentStr.includes("TRIP") || intentStr.includes("FLIGHT") ||
        intentStr.includes("HOTEL") || intentStr.includes("ITINERARY") || intentStr.includes("VISA") ||
        intentStr.includes("PASSPORT") || intentStr.includes("VACATION") || intentStr.includes("TOUR")) {
        return "travel";
    }
    // Automobile - Check for car, vehicle, automobile related terms (avoid matching CARDIO*)
    if (hasWord("CAR") || hasWord("VEHICLE") || intentStr.includes("AUTOMOBILE") ||
        intentStr.includes("BUY CAR") || intentStr.includes("PURCHASE CAR") || intentStr.includes("SELL CAR") ||
        intentStr.includes("OWNERSHIP") || intentStr.includes("VIN") || intentStr.includes("DMV") ||
        intentStr.includes("RECALL") || intentStr.includes("REGISTRATION") || intentStr.includes("TITLE")) {
        return "automobile";
    }
    // Real Estate
    if (intentStr.includes("PROPERTY") || intentStr.includes("ZONING") || intentStr.includes("LIEN") ||
        intentStr.includes("DEED") || intentStr.includes("REAL ESTATE") || intentStr.includes("BUY PROPERTY") ||
        intentStr.includes("HOUSE") || intentStr.includes("LAND") || intentStr.includes("APARTMENT")) {
        return "real-estate";
    }
    // Finance - Check for transfer with amount OR finance-related keywords
    if ((intentStr.includes("TRANSFER") && (intent.amount || intent.payload?.amount)) ||
        intentStr.includes("BANK") || intentStr.includes("PAYMENT") || intentStr.includes("LOAN") ||
        intentStr.includes("CREDIT") || intentStr.includes("FINANCE")) {
        return "finance";
    }
    // Manufacturing
    if (intentStr.includes("PRODUCTION") || intentStr.includes("MANUFACTURING") || intentStr.includes("SUPPLIER_CERT")) {
        return "manufacturing";
    }
    // Retail
    if (intentStr.includes("REFUND") || intentStr.includes("FRAUD") || intentStr.includes("SUPPLIER_ONBOARD") ||
        intentStr.includes("STORE") || intentStr.includes("SHOP")) {
        return "retail";
    }
    // Education
    if (intentStr.includes("CREDENTIAL") || intentStr.includes("TRANSCRIPT") || intentStr.includes("ACCREDITATION") ||
        intentStr.includes("SCHOOL") || intentStr.includes("EDUCATION") || intentStr.includes("COLLEGE")) {
        return "education";
    }
    // Communications
    if (intentStr.includes("MODERATION") || intentStr.includes("INTERCEPT") || intentStr.includes("MESSAGE")) {
        return "communications";
    }
    // Default fallback - but try to be smarter
    // If it's clearly a purchase/buy intent without car/property, default to retail
    if (intentStr.includes("BUY") || intentStr.includes("PURCHASE")) {
        return "retail";
    }
    return "retail"; // More generic default than real-estate
}
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function getDomainRules(industry) {
    try {
        // Try multiple possible paths for rules directory
        const possiblePaths = [
            path.join(__dirname, "../../../rules", `${industry}.json`),
            path.join(process.cwd(), "rules", `${industry}.json`),
            path.join(process.cwd(), "../rules", `${industry}.json`)
        ];
        for (const rulesPath of possiblePaths) {
            if (fs.existsSync(rulesPath)) {
                const rulesContent = fs.readFileSync(rulesPath, "utf-8");
                return JSON.parse(rulesContent);
            }
        }
    }
    catch (error) {
        console.warn(`Failed to load rules for ${industry}:`, error);
    }
    // Fallback to default structure
    return {
        industry,
        description: `Rules for ${industry} domain`,
        rules: []
    };
}
