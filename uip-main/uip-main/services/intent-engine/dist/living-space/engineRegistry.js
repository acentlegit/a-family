"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRegistry = makeRegistry;
function makeRegistry() {
    const engines = [];
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
                        severity: risk,
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
