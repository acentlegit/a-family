import { IntentSession } from "./runtime";

export function makeDigest(session: IntentSession) {
  const subject = `Intent Digest: ${session.title}`;
  const recent = session.events.slice(-12).reverse();
  const objs = session.stateObjects.slice(-10).reverse();

  const text: string[] = [];
  text.push(subject);
  text.push(`Intent Type: ${session.intentType}`);
  if (session.latestDecision) text.push(`Decision: ${session.latestDecision.status} — ${session.latestDecision.reason}`);
  if (session.explanation) text.push(`Explanation: ${session.explanation}`);
  text.push("");
  text.push("State Objects:");
  for (const o of objs) {
    const status = (o as any).status ?? (o as any).severity ?? "";
    text.push(`- ${o.kind}: ${o.title} (${status})`);
  }
  text.push("");
  text.push("Recent Events:");
  for (const e of recent) {
    if (e.type === "IntentReceived") text.push(`- Intent received: ${e.envelope.intentType}`);
    if (e.type === "EngineResult") text.push(`- Engine ${e.result.engine}: ${e.result.status} — ${e.result.summary}`);
    if (e.type === "Decision") text.push(`- Decision: ${e.decision.status} — ${e.decision.reason}`);
    if (e.type === "Evidence") text.push(`- Evidence: ${e.artifact.title}`);
    if (e.type === "Note") text.push(`- Note: ${e.text}`);
  }

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title>${subject}</title>
<style>
  body{font-family: ui-sans-serif,system-ui,-apple-system; background:#0B0F1A; color:#EAF0FF; padding:24px;}
  .card{background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:16px; margin:12px 0;}
  .title{font-size:18px; font-weight:700;}
  .muted{color:rgba(234,240,255,.65); font-size:12px;}
  .pill{display:inline-block; font-size:12px; border-radius:999px; padding:6px 10px; border:1px solid rgba(255,255,255,.12); margin-right:8px;}
  ul{padding-left:18px;}
  .grad{width:40px;height:40px;border-radius:16px;background:linear-gradient(135deg, rgba(109,94,246,.9), rgba(34,211,238,.8));display:inline-block;margin-right:10px;vertical-align:middle;}
</style>
</head>
<body>
  <div class="card">
    <span class="grad"></span>
    <span class="title">${subject}</span>
    <div class="muted">Intent Type: ${session.intentType}</div>
    ${session.explanation ? `<div class="muted" style="margin-top:6px">${session.explanation}</div>` : ""}
  </div>

  <div class="card">
    <span class="pill">Decision</span>
    <div>${session.latestDecision ? `${session.latestDecision.status} — ${session.latestDecision.reason}` : "No decision yet"}</div>
  </div>

  <div class="card">
    <span class="pill">State Objects</span>
    <ul>
      ${objs
        .map((o) => {
          const status = (o as any).status ?? (o as any).severity ?? "";
          return `<li><b>${o.kind}</b>: ${o.title} <span class="muted">(${status})</span></li>`;
        })
        .join("")}
    </ul>
  </div>

  <div class="card">
    <span class="pill">Recent Events</span>
    <ul>
      ${recent
        .map((e) => {
          if (e.type === "IntentReceived") return `<li><b>Intent</b>: ${e.envelope.intentType}</li>`;
          if (e.type === "EngineResult") return `<li><b>${e.result.engine}</b>: ${e.result.status} — ${e.result.summary}</li>`;
          if (e.type === "Decision") return `<li><b>Decision</b>: ${e.decision.status} — ${e.decision.reason}</li>`;
          if (e.type === "Evidence") return `<li><b>Evidence</b>: ${e.artifact.title}</li>`;
          if (e.type === "Note") return `<li><b>Note</b>: ${e.text}</li>`;
          return `<li>Event</li>`;
        })
        .join("")}
    </ul>
  </div>
</body>
</html>`;

  return { subject, html, text: text.join("\n") };
}
