import {
  Decision,
  EngineResult,
  EvidenceArtifact,
  GraphEdge,
  IntentEnvelope,
  StateObject,
  makeRegistry,
} from "./engineRegistry";

export type SessionEvent =
  | { type: "IntentReceived"; ts: number; envelope: IntentEnvelope }
  | { type: "EngineResult"; ts: number; result: EngineResult }
  | { type: "Evidence"; ts: number; artifact: EvidenceArtifact }
  | { type: "Decision"; ts: number; decision: Decision }
  | { type: "Note"; ts: number; by: string; text: string };

export type ActorState = "online" | "reviewing" | "blocked" | "executing" | "monitoring" | "offline";
export type ActorRole = "requester" | "agent" | "approver" | "auditor" | "observer";

export type IntentActor = {
  id: string;
  name: string;
  role: ActorRole;
  state: ActorState;
};

export type IntentSession = {
  id: string;
  title: string;
  intentType: string;
  createdAt: number;
  actors: IntentActor[];
  events: SessionEvent[];
  stateObjects: StateObject[];
  edges: GraphEdge[];
  latestDecision?: Decision;
  explanation?: string;
};

function now() {
  return Date.now();
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export class IntentOSRuntime {
  private registry = makeRegistry();

  public ingestIntent(session: IntentSession, envelope: IntentEnvelope) {
    session.intentType = envelope.intentType || session.intentType;
    session.events.push({ type: "IntentReceived", ts: now(), envelope });

    const ctx = { now, uid };

    const allResults: EngineResult[] = [];
    const allEvidence: EvidenceArtifact[] = [];
    const allObjects: StateObject[] = [];

    for (const engine of this.registry) {
      const out = engine.run(envelope, ctx as any);
      allResults.push(out.result);
      if (out.evidence) allEvidence.push(...out.evidence);
      if (out.objects) allObjects.push(...out.objects);
    }

    for (const r of allResults) session.events.push({ type: "EngineResult", ts: now(), result: r });
    for (const e of allEvidence) session.events.push({ type: "Evidence", ts: now(), artifact: e });

    const decision = this.makeDecision(allResults, allObjects);
    session.latestDecision = decision;
    session.events.push({ type: "Decision", ts: now(), decision });

    const expl = allResults.find((r) => r.engine === "Explainability")?.details?.explanation;
    session.explanation = typeof expl === "string" ? expl : undefined;

    session.stateObjects = this.makeTruthLayer(allObjects, decision);
    session.edges = this.makeTraceEdges(session.stateObjects);
    this.updatePresence(session);
  }

  private makeDecision(results: EngineResult[], objects: StateObject[]): Decision {
    const policy = results.find((r) => r.engine === "Policy")?.status ?? "pass";
    const compliance = results.find((r) => r.engine === "Compliance")?.status ?? "pass";
    const riskObj = objects.find((o) => o.kind === "RiskFlag") as any;

    const risk = riskObj?.severity ?? "low";

    if (policy === "warn" || compliance === "warn" || risk === "high") {
      return { status: "needs_review", reason: "Human approval required (policy/compliance/risk flags)" };
    }
    if (policy === "fail" || compliance === "fail") {
      return { status: "rejected", reason: "Rejected by governance engines" };
    }
    return { status: "approved", reason: "All checks passed" };
  }

  private makeTruthLayer(objects: StateObject[], decision: Decision): StateObject[] {
    const d: StateObject = {
      id: uid("obj"),
      kind: "Decision",
      title: "Final decision",
      status: decision.status,
      owner: decision.status === "needs_review" ? "approver" : undefined,
      createdAt: now(),
    };

    const out = [...objects, d];

    if (decision.status === "needs_review") {
      const blocker: StateObject = {
        id: uid("obj"),
        kind: "Blocker",
        title: "Awaiting approver decision",
        status: "open",
        owner: "approver",
        createdAt: now(),
      };
      const task: StateObject = {
        id: uid("obj"),
        kind: "Task",
        title: "Review intent + approve/reject",
        status: "open",
        owner: "approver",
        createdAt: now(),
      };
      out.push(blocker, task);
    }
    return out;
  }

  private makeTraceEdges(objects: StateObject[]): GraphEdge[] {
    const decision = objects.find((o) => o.kind === "Decision");
    if (!decision) return [];

    const edges: GraphEdge[] = [];
    for (const o of objects) {
      if (o.id === decision.id) continue;
      if (o.kind === "Task") edges.push({ from: o.id, to: decision.id, label: "drives decision" });
      else if (o.kind === "Blocker") edges.push({ from: o.id, to: decision.id, label: "blocks decision" });
      else edges.push({ from: o.id, to: decision.id, label: `${o.kind.toLowerCase()} influences decision` });
    }
    return edges.slice(0, 32);
  }

  private updatePresence(session: IntentSession) {
    const blockers = session.stateObjects.filter((o) => o.kind === "Blocker" && (o as any).status === "open");
    const decision = session.latestDecision?.status;

    for (const a of session.actors) {
      if (a.role === "approver") {
        a.state = blockers.length ? "reviewing" : "online";
      }
      if (a.role === "agent") {
        a.state = decision === "approved" ? "executing" : blockers.length ? "blocked" : "monitoring";
      }
      if (a.role === "auditor") {
        a.state = "monitoring";
      }
    }
  }
}
