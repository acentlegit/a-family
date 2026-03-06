"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentOSRuntime = void 0;
const engineRegistry_1 = require("./engineRegistry");
function now() {
    return Date.now();
}
function uid(prefix) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
class IntentOSRuntime {
    registry = (0, engineRegistry_1.makeRegistry)();
    ingestIntent(session, envelope) {
        session.intentType = envelope.intentType || session.intentType;
        session.events.push({ type: "IntentReceived", ts: now(), envelope });
        const ctx = { now, uid };
        const allResults = [];
        const allEvidence = [];
        const allObjects = [];
        for (const engine of this.registry) {
            const out = engine.run(envelope, ctx);
            allResults.push(out.result);
            if (out.evidence)
                allEvidence.push(...out.evidence);
            if (out.objects)
                allObjects.push(...out.objects);
        }
        for (const r of allResults)
            session.events.push({ type: "EngineResult", ts: now(), result: r });
        for (const e of allEvidence)
            session.events.push({ type: "Evidence", ts: now(), artifact: e });
        const decision = this.makeDecision(allResults, allObjects);
        session.latestDecision = decision;
        session.events.push({ type: "Decision", ts: now(), decision });
        const expl = allResults.find((r) => r.engine === "Explainability")?.details?.explanation;
        session.explanation = typeof expl === "string" ? expl : undefined;
        session.stateObjects = this.makeTruthLayer(allObjects, decision);
        session.edges = this.makeTraceEdges(session.stateObjects);
        this.updatePresence(session);
    }
    makeDecision(results, objects) {
        const policy = results.find((r) => r.engine === "Policy")?.status ?? "pass";
        const compliance = results.find((r) => r.engine === "Compliance")?.status ?? "pass";
        const riskObj = objects.find((o) => o.kind === "RiskFlag");
        const risk = riskObj?.severity ?? "low";
        if (policy === "warn" || compliance === "warn" || risk === "high") {
            return { status: "needs_review", reason: "Human approval required (policy/compliance/risk flags)" };
        }
        if (policy === "fail" || compliance === "fail") {
            return { status: "rejected", reason: "Rejected by governance engines" };
        }
        return { status: "approved", reason: "All checks passed" };
    }
    makeTruthLayer(objects, decision) {
        const d = {
            id: uid("obj"),
            kind: "Decision",
            title: "Final decision",
            status: decision.status,
            owner: decision.status === "needs_review" ? "approver" : undefined,
            createdAt: now(),
        };
        const out = [...objects, d];
        if (decision.status === "needs_review") {
            const blocker = {
                id: uid("obj"),
                kind: "Blocker",
                title: "Awaiting approver decision",
                status: "open",
                owner: "approver",
                createdAt: now(),
            };
            const task = {
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
    makeTraceEdges(objects) {
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
    updatePresence(session) {
        const blockers = session.stateObjects.filter((o) => o.kind === "Blocker" && o.status === "open");
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
exports.IntentOSRuntime = IntentOSRuntime;
