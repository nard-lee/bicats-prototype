// Message builders for resident SMS. Keep each message short and under the
// 670-character UniSMS limit; templates are plain text (no HTML).

import { formatShortWhen } from "../notify/format.js";
import { kindLabel, statusLabel } from "../notify/labels.js";

export function statusUpdateSms(input: {
  reference: string;
  status: string;
  publicNote?: string | null;
  hearingAt?: Date | null;
}): string {
  const label = statusLabel(input.status);
  const parts = [`BARANGAY: Your complaint ${input.reference} is now "${label}".`];

  if (input.hearingAt) {
    parts.push(`Mediation set on ${formatShortWhen(input.hearingAt)}.`);
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
    `BARANGAY: Your ${kindLabel(input.kind)} for ${input.reference} is ${verb} on ${formatShortWhen(input.scheduledAt)}.`,
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

// Daily pre-session reminder for the complainant.
export function hearingReminderSms(input: {
  reference: string;
  kind: string;
  scheduledAt: Date;
  location?: string | null;
}): string {
  const parts = [
    `BARANGAY: Reminder that your ${kindLabel(input.kind)} session for ${input.reference} is within 24 hours, on ${formatShortWhen(input.scheduledAt)}.`,
  ];

  if (input.location) {
    parts.push(`Venue: ${input.location}.`);
  }
  parts.push("Bring any documents related to your case. Please arrive on time. Do not reply.");

  return parts.join(" ");
}
