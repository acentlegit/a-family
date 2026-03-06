import { orchestrateIntent } from "./orchestrator";

export async function execute(req: any) {
  try {
    // Use orchestrator for full intent evaluation
    const result = await orchestrateIntent(req);
    return result;
  } catch (error: any) {
    // Fallback to simple processing if orchestrator fails
    return {
      intentId: `INT-${Date.now()}`,
      industry: req.industry || "real-estate",
      status: "RECEIVED",
      decision: "ALLOW",
      reason: `Intent received: ${error.message}`
    };
  }
}
