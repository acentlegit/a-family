export interface EngineRequest {
  intentId: string;
  actor: string;
  context: Record<string, unknown>;
}

export interface EngineResponse {
  decision: "ALLOW" | "DENY" | "REVIEW";
  reason: string;
}