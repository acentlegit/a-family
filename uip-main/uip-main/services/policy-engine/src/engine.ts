
import { Intent } from "@uip/core";

export function authorize(intent: Intent, roles: string[]) {
  if (roles.includes("ADMIN")) return { authorized: true };
  if (intent.type === "EXECUTE" && !roles.includes("AUTHORITY")) {
    return { authorized: false, reason: "Authority role required" };
  }
  return { authorized: true };
}
