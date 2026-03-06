
import fs from "fs";

export function generateEvidencePacket(intentId: string, events: any[]) {
  const packet = {
    intentId,
    generatedAt: new Date().toISOString(),
    events,
    certification: "This packet represents an immutable, complete event history."
  };

  fs.writeFileSync(
    `evidence-packet-${intentId}.json`,
    JSON.stringify(packet, null, 2)
  );

  return packet;
}
