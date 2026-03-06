import { FastifyInstance } from "fastify";
import { execute } from "./handler";
import { generateEngineResponse } from "./ollama-service";
import { makeDigest } from "./living-space/digest";
import { IntentEnvelope } from "./living-space/engineRegistry";
import {
  addNoteEvent,
  createSession,
  executeSession,
  getSession,
  listSessionSummaries,
} from "./living-space/store";

export default async function routes(app: FastifyInstance) {
  app.get("/v1/health", async () => ({ status: "ok" }));

  app.post("/v1/execute", async (req) => {
    return execute(req.body as any);
  });

  app.get("/api/intents/sessions", async () => {
    return listSessionSummaries();
  });

  app.get("/api/intents/sessions/:id", async (req, reply) => {
    const id = (req.params as any).id;
    const session = getSession(id);
    if (!session) return reply.code(404).send({ error: "Session not found" });
    return session;
  });

  app.post("/api/intents/sessions", async (req, reply) => {
    const body = req.body as any;
    const session = createSession(body?.title, body?.intentType);
    const broadcast = (app as any).broadcast as undefined | ((payload: any) => void);
    if (broadcast) broadcast({ type: "session_created", sessionId: session.id });
    return reply.send(session);
  });

  app.post("/api/intents/sessions/:id/events", async (req, reply) => {
    const id = (req.params as any).id;
    const body = req.body as any;
    const updated = addNoteEvent(id, String(body?.by ?? "user"), String(body?.text ?? ""));
    if (!updated) return reply.code(404).send({ error: "Session not found" });
    const broadcast = (app as any).broadcast as undefined | ((payload: any) => void);
    if (broadcast) broadcast({ type: "session_updated", sessionId: id });
    return reply.send({ ok: true });
  });

  app.post("/api/intents/sessions/:id/execute", async (req, reply) => {
    const id = (req.params as any).id;
    const envelope = req.body as IntentEnvelope;
    const session = await executeSession(id, envelope);
    if (!session) return reply.code(404).send({ error: "Session not found" });
    const broadcast = (app as any).broadcast as undefined | ((payload: any) => void);
    if (broadcast) broadcast({ type: "session_updated", sessionId: id });
    return reply.send({
      sessionId: session.id,
      latestDecision: session.latestDecision ?? null,
      explanation: session.explanation ?? null,
      stateObjects: session.stateObjects,
      edges: session.edges,
    });
  });

  app.post("/api/spaces/:id/digest", async (req, reply) => {
    const id = (req.params as any).id;
    const session = getSession(id);
    if (!session) return reply.code(404).send("Session not found");
    return reply.send(makeDigest(session));
  });
  
  // Test endpoint to verify Ollama integration
  app.post("/v1/test-ollama", async (req: any) => {
    const { intent, industry = "generic" } = req.body;
    if (!intent) {
      return { error: "Intent text required" };
    }
    
    console.log("[Test] Testing Ollama with intent:", intent);
    
    const testResult = {
      decision: "ALLOW",
      reason: "Test default"
    };
    
    try {
      const enhanced = await generateEngineResponse('compliance', intent, industry, {}, testResult);
      return {
        original: testResult,
        enhanced: enhanced,
        ollamaWorking: enhanced.ollamaEnhanced === true,
        response: enhanced.reason || enhanced.why || "No response"
      };
    } catch (error: any) {
      return {
        error: error.message,
        stack: error.stack,
        ollamaWorking: false
      };
    }
  });
  
  // Admin API endpoints
  app.get("/admin/engines", async () => {
    const engines = [
      "intent-engine",
      "compliance-engine",
      "policy-engine",
      "risk-engine",
      "explainability-engine",
      "evidence-engine",
      "appeals-engine",
      "routing-engine",
      "integration-engine",
      "identity-engine",
      "tenancy-engine",
      "quota-engine",
      "pricing-engine",
      "versioning-engine",
      "change-engine",
      "ai-engine",
      "simulation-engine",
      "learning-engine"
    ];
    return engines;
  });
  
  app.get("/admin/reports/changes", async () => {
    // Return audit log of changes
    return {
      changes: [],
      timestamp: new Date().toISOString(),
      message: "Audit log endpoint - would return change history in production"
    };
  });
}
