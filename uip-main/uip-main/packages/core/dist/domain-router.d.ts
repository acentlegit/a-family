export type Industry = "real-estate" | "healthcare" | "finance" | "automobile" | "manufacturing" | "retail" | "education" | "travel" | "communications";
export type IntentType = "BUY_PROPERTY" | "TRANSFER_PROPERTY" | "ZONING_APPEAL" | "LIEN_RECORDING" | "AUTHORIZE_TREATMENT" | "PRESCRIPTION_APPROVAL" | "CARE_DENIAL_APPEAL" | "AUTHORIZE_TRANSFER" | "CREDIT_DECISION" | "AML_REVIEW" | "TRANSFER_OWNERSHIP" | "RECALL_INITIATION" | "PRODUCTION_CHANGE" | "SUPPLIER_CERTIFICATION" | "REFUND_APPROVAL" | "FRAUD_REVIEW" | "SUPPLIER_ONBOARDING" | "CREDENTIAL_ISSUANCE" | "TRANSCRIPT_RELEASE" | "ACCREDITATION_REVIEW" | "CONTENT_MODERATION" | "LAWFUL_INTERCEPT";
export interface IntentRequest {
    intent: IntentType;
    industry?: Industry;
    domain?: Industry;
    actorId?: string;
    actorRole?: string;
    tenantId?: string;
    payload?: any;
    [key: string]: any;
}
export declare function detectIndustry(intent: IntentRequest): Industry;
export declare function getDomainRules(industry: Industry): any;
