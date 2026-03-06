
export interface Dispute {
  intentId: string;
  submittedBy: string;
  reason: string;
  evidence: string[];
}

export function adjudicate(dispute: Dispute) {
  return {
    status: "UNDER_REVIEW",
    assignedAuthority: "GOVERNING_BODY",
    receivedAt: new Date().toISOString()
  };
}
