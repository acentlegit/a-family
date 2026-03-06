"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSessionSummaries = listSessionSummaries;
exports.getSession = getSession;
exports.createSession = createSession;
exports.addNoteEvent = addNoteEvent;
exports.executeSession = executeSession;
const orchestrator_1 = require("../orchestrator");
function now() {
    return Date.now();
}
function uid(prefix) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
const sessions = new Map();
function seedSessions() {
    const demo = [
        { intentType: "refund", title: "Refund Approval • Order #18421" },
        { intentType: "permit", title: "Permit Issuance • Deck Construction" },
        { intentType: "credit-decision", title: "Credit Decision • Applicant #9921" },
        { intentType: "treatment-authorization", title: "Treatment Authorization • MRI Request" },
        { intentType: "property-transfer", title: "Property Transfer • Parcel 12A" },
    ];
    for (const d of demo) {
        const id = uid("intent");
        sessions.set(id, {
            id,
            title: d.title,
            intentType: d.intentType,
            createdAt: now() - 1000 * 60 * 20,
            actors: [
                { id: "a1", name: "Alex", role: "approver", state: "reviewing" },
                { id: "a2", name: "Jordan", role: "agent", state: "executing" },
                { id: "a3", name: "Sam", role: "requester", state: "online" },
                { id: "a4", name: "Casey", role: "auditor", state: "monitoring" },
            ],
            events: [{ type: "Note", ts: now() - 1000 * 60 * 18, by: "system", text: "Session seeded" }],
            stateObjects: [],
            edges: [],
        });
    }
}
seedSessions();
function listSessionSummaries() {
    return Array.from(sessions.values()).map((s) => ({
        id: s.id,
        title: s.title,
        intentType: s.intentType,
        createdAt: s.createdAt,
        actors: s.actors,
        latestDecision: s.latestDecision ?? null,
        eventCount: s.events.length,
        stateCount: s.stateObjects.length,
    }));
}
function getSession(id) {
    return sessions.get(id) ?? null;
}
function createSession(title, intentType) {
    const id = uid("intent");
    const session = {
        id,
        title: title ?? `Intent Session • ${intentType ?? "generic"}`,
        intentType: intentType ?? "generic",
        createdAt: now(),
        actors: [
            { id: "a_req", name: "Requester", role: "requester", state: "online" },
            { id: "a_app", name: "Approver", role: "approver", state: "reviewing" },
            { id: "a_agent", name: "Agent", role: "agent", state: "executing" },
            { id: "a_aud", name: "Auditor", role: "auditor", state: "monitoring" },
        ],
        events: [{ type: "Note", ts: now(), by: "system", text: "Session created" }],
        stateObjects: [],
        edges: [],
    };
    sessions.set(id, session);
    return session;
}
function addNoteEvent(id, by, text) {
    const session = sessions.get(id);
    if (!session)
        return null;
    session.events.push({ type: "Note", ts: now(), by, text });
    return session;
}
function decisionToStatus(decision) {
    const upper = String(decision ?? "").toUpperCase();
    if (upper === "ALLOW")
        return "pass";
    if (upper === "DENY")
        return "fail";
    if (upper === "REVIEW")
        return "warn";
    return undefined;
}
function riskToSeverity(level) {
    const upper = String(level ?? "").toUpperCase();
    if (upper === "LOW")
        return "low";
    if (upper === "MEDIUM")
        return "medium";
    if (upper === "HIGH" || upper === "CRITICAL")
        return "high";
    return undefined;
}
function finalDecisionToStatus(finalDecision) {
    const upper = String(finalDecision ?? "").toUpperCase();
    if (upper === "ALLOW")
        return "approved";
    if (upper === "DENY")
        return "rejected";
    if (upper === "REVIEW" || upper === "UNKNOWN")
        return "needs_review";
    return undefined;
}
function buildEdges(objects) {
    const decision = objects.find((o) => o.kind === "Decision");
    if (!decision)
        return [];
    const edges = [];
    for (const o of objects) {
        if (o.id === decision.id)
            continue;
        if (o.kind === "Task")
            edges.push({ from: o.id, to: decision.id, label: "drives decision" });
        else if (o.kind === "Blocker")
            edges.push({ from: o.id, to: decision.id, label: "blocks decision" });
        else
            edges.push({ from: o.id, to: decision.id, label: `${o.kind.toLowerCase()} influences decision` });
    }
    return edges.slice(0, 32);
}
function buildEngineEvent(engine, status, summary, details) {
    return {
        engine: engine,
        status: status ?? "warn",
        summary: summary ?? "No summary available",
        details,
    };
}
async function executeSession(id, envelope) {
    const session = sessions.get(id);
    if (!session)
        return null;
    session.intentType = envelope.intentType || session.intentType;
    session.events.push({ type: "IntentReceived", ts: now(), envelope });
    const orchestratorResult = await (0, orchestrator_1.orchestrateIntent)({
        intent: envelope.intentType,
        actorRole: envelope.actor?.role,
        actorId: envelope.actor?.id,
        inputs: envelope.inputs,
        constraints: envelope.constraints,
    });
    const engines = orchestratorResult?.engines ?? {};
    const complianceDecision = engines.compliance?.decision;
    const policyDecision = engines.policy?.decision;
    const riskLevel = engines.risk?.riskLevel;
    const evidenceRecords = engines.evidence?.records;
    const evidenceValid = engines.evidence?.valid;
    const explanation = engines.explainability?.why || engines.explainability?.explanation;
    const engineEvents = [];
    const complianceStatus = decisionToStatus(complianceDecision);
    if (complianceStatus) {
        engineEvents.push(buildEngineEvent("Compliance", complianceStatus, engines.compliance?.reason || engines.compliance?.summary, engines.compliance));
    }
    const policyStatus = decisionToStatus(policyDecision);
    if (policyStatus) {
        engineEvents.push(buildEngineEvent("Policy", policyStatus, engines.policy?.reason || engines.policy?.summary, engines.policy));
    }
    const riskSeverity = riskToSeverity(riskLevel);
    if (riskSeverity) {
        engineEvents.push(buildEngineEvent("Risk", riskSeverity === "high" ? "warn" : "pass", `Risk score: ${riskLevel}`, engines.risk));
    }
    if (evidenceRecords || typeof evidenceValid === "boolean") {
        engineEvents.push(buildEngineEvent("Evidence", evidenceValid === false ? "fail" : "pass", "Evidence artifact produced", engines.evidence));
    }
    if (explanation) {
        engineEvents.push(buildEngineEvent("Explainability", "pass", "Explanation generated", engines.explainability));
    }
    for (const evt of engineEvents) {
        session.events.push({ type: "EngineResult", ts: now(), result: evt });
    }
    const decisionStatus = finalDecisionToStatus(orchestratorResult?.finalDecision);
    if (decisionStatus) {
        session.latestDecision = {
            status: decisionStatus,
            reason: explanation || orchestratorResult?.finalDecision || "Decision computed",
        };
        session.events.push({ type: "Decision", ts: now(), decision: session.latestDecision });
    }
    else {
        session.latestDecision = undefined;
    }
    session.explanation = typeof explanation === "string" ? explanation : undefined;
    const objects = [];
    if (complianceStatus) {
        objects.push({
            id: uid("obj"),
            kind: "ComplianceCheck",
            title: "Compliance evaluation",
            status: complianceStatus,
            createdAt: now(),
        });
    }
    if (policyStatus) {
        objects.push({
            id: uid("obj"),
            kind: "PolicyCheck",
            title: "Policy evaluation",
            status: policyStatus,
            createdAt: now(),
        });
    }
    if (riskSeverity) {
        objects.push({
            id: uid("obj"),
            kind: "RiskFlag",
            title: `Risk = ${riskLevel}`,
            severity: riskSeverity,
            createdAt: now(),
        });
    }
    if (evidenceRecords || typeof evidenceValid === "boolean") {
        objects.push({
            id: uid("obj"),
            kind: "Evidence",
            title: "Evidence artifact produced",
            status: evidenceValid === false ? "missing" : "ready",
            createdAt: now(),
        });
    }
    if (session.latestDecision) {
        objects.push({
            id: uid("obj"),
            kind: "Decision",
            title: "Final decision",
            status: session.latestDecision.status,
            owner: session.latestDecision.status === "needs_review" ? "approver" : undefined,
            createdAt: now(),
        });
    }
    if (session.latestDecision?.status === "needs_review") {
        objects.push({
            id: uid("obj"),
            kind: "Blocker",
            title: "Awaiting approver decision",
            status: "open",
            owner: "approver",
            createdAt: now(),
        }, {
            id: uid("obj"),
            kind: "Task",
            title: "Review intent + approve/reject",
            status: "open",
            owner: "approver",
            createdAt: now(),
        });
    }
    session.stateObjects = objects;
    session.edges = buildEdges(objects);
    return session;
}
