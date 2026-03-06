
import fs from "fs";

export function generateCourtPDF(intentId: string, summary: string) {
  const content = `Court Evidence Packet\nIntent: ${intentId}\n${summary}`;
  fs.writeFileSync(`court-${intentId}.pdf`, content);
}
