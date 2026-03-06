import { EngineRequest, EngineResponse } from "./types";

export async function execute(req: EngineRequest): Promise<EngineResponse> {
  return { decision: "ALLOW", reason: "Stub decision" };
}