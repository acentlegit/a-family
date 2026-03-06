export interface IntentPayload {
    amount?: number;
    irreversible?: boolean;
    zoning?: string;
    controlled?: boolean;
}
export interface Intent {
    id: string;
    type?: "EXECUTE" | "EVALUATE" | "SIMULATE";
    industry?: string;
    payload?: Record<string, any>;
    metadata?: Record<string, any>;
}
export * from "./domain-router";
