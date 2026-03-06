import { detectIndustry, IntentRequest, Industry } from "@uip/core";

export interface IntentResponse {
  intentId: string;
  industry: Industry;
  status: "RECEIVED" | "PROCESSING" | "ALLOWED" | "DENIED" | "PENDING";
  timestamp: string;
}

export async function processIntent(req: IntentRequest): Promise<IntentResponse> {
  const industry = detectIndustry(req);
  const intentId = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  return {
    intentId,
    industry,
    status: "RECEIVED",
    timestamp: new Date().toISOString()
  };
}

