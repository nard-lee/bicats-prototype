// Resident-facing wording shared by SMS and email so both channels stay in sync.

const STATUS_LABELS: Record<string, string> = {
  received: "received",
  summoned: "summoned",
  mediation: "in mediation",
  conciliation: "in conciliation",
  settled: "settled",
  certified: "certified for filing",
  dismissed: "dismissed",
};

const KIND_LABELS: Record<string, string> = {
  mediation: "mediation",
  conciliation: "conciliation",
  hearing: "arbitration",
};

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
