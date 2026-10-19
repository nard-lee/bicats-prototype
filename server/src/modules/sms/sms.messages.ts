// Message builders for resident SMS. Keep each message short and under the
// 670-character UniSMS limit; templates are plain text (no HTML).

const STATUS_LABEL: Record<string, string> = {
  received: "received",
  summoned: "summoned",
  mediation: "in mediation",
  conciliation: "in conciliation",
  settled: "settled",
  certified: "certified for filing",
  dismissed: "dismissed",
};

const KIND_LABEL: Record<string, string> = {
  mediation: "mediation",
  conciliation: "conciliation",
  hearing: "arbitration",
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function formatWhen(date: Date): string {
  return date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export function statusUpdateSms(input: {
  reference: string;
  status: string;
  publicNote?: string | null;
  hearingAt?: Date | null;
}): string {
  const label = STATUS_LABEL[input.status] ?? input.status;
  const parts = [`BARANGAY: Your complaint ${input.reference} is now "${label}".`];

  if (input.hearingAt) {
    parts.push(`Mediation set on ${formatWhen(input.hearingAt)}.`);
  }
  if (input.publicNote) {
    parts.push(input.publicNote);
  }
  parts.push("Track it via the BICATS portal. Do not reply.");

  return parts.join(" ");
}

export function mediationScheduledSms(input: {
  reference: string;
  kind: string;
  scheduledAt: Date;
  location?: string | null;
  rescheduled?: boolean;
}): string {
  const verb = input.rescheduled ? "rescheduled" : "scheduled";
  const parts = [
    `BARANGAY: Your ${kindLabel(input.kind)} for ${input.reference} is ${verb} on ${formatWhen(input.scheduledAt)}.`,
  ];

  if (input.location) {
    parts.push(`Venue: ${input.location}.`);
  }
  parts.push("Please arrive on time. Do not reply.");

  return parts.join(" ");
}

export function mediationCancelledSms(input: { reference: string; kind: string }): string {
  return `BARANGAY: Your ${kindLabel(input.kind)} for ${input.reference} has been cancelled. We will inform you of the next step. Do not reply.`;
}
