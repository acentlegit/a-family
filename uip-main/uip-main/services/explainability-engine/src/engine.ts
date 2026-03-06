
import { Intent } from "@uip/core";

export function explain(intent: Intent, engineResults: any[]) {
  return {
    intentId: intent.id,
    explanation: engineResults.map(r =>
      `${r.engine}: ${r.outcome}${r.reason ? " - " + r.reason : ""}`
    ).join("\n"),
    audience: ["USER", "REGULATOR", "AUDITOR"]
  };
}
