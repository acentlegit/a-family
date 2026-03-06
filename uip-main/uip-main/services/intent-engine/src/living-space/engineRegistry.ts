export type EngineName =
  | "Intent"
  | "Policy"
  | "Compliance"
  | "Risk"
  | "Evidence"
  | "Explainability"
  | "Simulation"
  | "Dispute"
  | "Pricing";

export type ActorRole = "requester" | "agent" | "approver" | "auditor" | "observer";

export type RequiredOutput = "decision" | "evidence" | "explanation" | "audit";

export type IntentEnvelope = {
  intentType: string;
  actor: { id: string; role: ActorRole };
  inputs: Record<string, any>;
  constraints?: Record<string, any>;
  requiredOutputs?: RequiredOutput[];
};

export type EngineStatus = "pass" | "warn" | "fail";

export type EngineResult = {
  engine: EngineName;
  status: EngineStatus;
  summary: string;
  details?: Record<string, any>;
};

export type EvidenceArtifact = {
  kind: "record" | "log" | "document" | "audit";
  title: string;
  uri?: string;
  data?: Record<string, any>;
};

export type Decision = {
  status: "approved" | "rejected" | "needs_review";
  reason: string;
};

export type StateObject =
  | { id: string; kind: "Decision"; title: string; status: Decision["status"]; owner?: string; createdAt: number }
  | { id: string; kind: "RiskFlag"; title: string; severity: "low" | "medium" | "high"; owner?: string; createdAt: number }
  | { id: string; kind: "ComplianceCheck"; title: string; status: EngineStatus; createdAt: number }
  | { id: string; kind: "PolicyCheck"; title: string; status: EngineStatus; createdAt: number }
  | { id: string; kind: "Evidence"; title: string; status: "ready" | "missing"; createdAt: number }
  | { id: string; kind: "Task"; title: string; status: "open" | "done"; owner?: string; createdAt: number }
  | { id: string; kind: "Blocker"; title: string; status: "open" | "resolved"; owner?: string; createdAt: number };

export type GraphEdge = { from: string; to: string; label: string };

export type EngineContext = {
  now: () => number;
  uid: (prefix: string) => string;
};

export type Engine = {
  name: EngineName;
  run: (envelope: IntentEnvelope, ctx: EngineContext) => {
    result: EngineResult;
    evidence?: EvidenceArtifact[];
    objects?: StateObject[];
    edges?: GraphEdge[];
  };
};

export function makeRegistry() {
  const engines: Engine[] = [];

  engines.push({
    name: "Intent",
    run: (env) => ({
      result: {
        engine: "Intent",
        status: "pass",
        summary: `Intent parsed: ${env.intentType}`,
        details: { requiredOutputs: env.requiredOutputs ?? [] },
      },
    }),
  });

  engines.push({
    name: "Policy",
    run: (env, ctx) => {
      const policyOk = !String(env.intentType).toLowerCase().includes("illegal");
      return {
        result: {
          engine: "Policy",
          status: policyOk ? "pass" : "warn",
          summary: policyOk ? "Policy checks passed" : "Policy requires additional verification",
          details: { policyVersion: env.constraints?.policyVersion ?? "v1" },
        },
        objects: [
          {
            id: ctx.uid("obj"),
            kind: "PolicyCheck",
            title: "Policy evaluation",
            status: policyOk ? "pass" : "warn",
            createdAt: ctx.now(),
          },
        ],
      };
    },
  });

  engines.push({
    name: "Compliance",
    run: (env, ctx) => {
      const hasJurisdiction = Boolean(env.constraints?.jurisdiction);
      return {
        result: {
          engine: "Compliance",
          status: hasJurisdiction ? "pass" : "warn",
          summary: hasJurisdiction ? "Jurisdiction constraints present" : "Jurisdiction missing (review recommended)",
          details: { jurisdiction: env.constraints?.jurisdiction ?? null },
        },
        objects: [
          {
            id: ctx.uid("obj"),
            kind: "ComplianceCheck",
            title: "Compliance evaluation",
            status: hasJurisdiction ? "pass" : "warn",
            createdAt: ctx.now(),
          },
        ],
      };
    },
  });

  engines.push({
    name: "Risk",
    run: (env, ctx) => {
      const amount = Number(env.inputs?.amount ?? 0);
      const risk = amount > 1000 ? "high" : amount > 250 ? "medium" : "low";
      return {
        result: {
          engine: "Risk",
          status: risk === "high" ? "warn" : "pass",
          summary: `Risk score: ${risk}`,
          details: { amount },
        },
        objects: [
          {
            id: ctx.uid("obj"),
            kind: "RiskFlag",
            title: `Risk = ${risk}`,
            severity: risk as any,
            createdAt: ctx.now(),
          },
        ],
      };
    },
  });

  engines.push({
    name: "Evidence",
    run: (env, ctx) => ({
      result: {
        engine: "Evidence",
        status: "pass",
        summary: "Evidence artifact produced",
      },
      evidence: [
        {
          kind: "record",
          title: `${env.intentType} record`,
          data: { inputs: env.inputs, constraints: env.constraints, actor: env.actor },
        },
      ],
      objects: [
        {
          id: ctx.uid("obj"),
          kind: "Evidence",
          title: "Evidence artifact produced",
          status: "ready",
          createdAt: ctx.now(),
        },
      ],
    }),
  });

  engines.push({
    name: "Explainability",
    run: (env) => {
      const amount = Number(env.inputs?.amount ?? 0);
      const risk = amount > 1000 ? "high" : amount > 250 ? "medium" : "low";
      const explanation = [
        `Intent "${env.intentType}" evaluated by Policy/Compliance/Risk engines.`,
        `Risk="${risk}" derived from amount=${amount}.`,
        env.constraints?.jurisdiction ? "Jurisdiction present." : "Jurisdiction missing.",
      ].join(" ");
      return {
        result: {
          engine: "Explainability",
          status: "pass",
          summary: "Explanation generated",
          details: { explanation },
        },
        evidence: [
          {
            kind: "audit",
            title: "Explainability artifact",
            data: { explanation },
          },
        ],
      };
    },
  });

  return engines;
}
