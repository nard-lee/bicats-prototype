// Email bodies for resident notifications (plain text + simple HTML).
// Subjects and text are kept short and share the same wording as SMS.

import { formatLongWhen } from "../notify/format.js";
import { kindLabel, statusLabel } from "../notify/labels.js";
import type { EmailMessage } from "./email.types.js";

function stripTags(lines: string[]): string {
  return lines.map((line) => line.replace(/<[^>]+>/g, "")).join("\n\n");
}

function wrap(title: string, lines: string[]): string {
  const body = lines
    .map((line) => `<p style="margin:0 0 12px">${line}</p>`)
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f6f6f7;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:24px">
    <h1 style="margin:0 0 16px;font-size:18px">${title}</h1>
    ${body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
    <p style="margin:0;font-size:12px;color:#6b7280">This is an automated message from the Barangay BICATS system. Please do not reply.</p>
  </div>
</body></html>`;
}

export function statusUpdateEmail(input: {
  reference: string;
  status: string;
  publicNote?: string | null;
  hearingAt?: Date | null;
}): EmailMessage {
  const label = statusLabel(input.status);
  const subject = `BICATS: Complaint ${input.reference} is now "${label}"`;

  const lines = [
    `Your complaint <strong>${input.reference}</strong> is now <strong>"${label}"</strong>.`,
  ];
  if (input.hearingAt) {
    lines.push(`A mediation session is set on <strong>${formatLongWhen(input.hearingAt)}</strong>.`);
  }
  if (input.publicNote) {
    lines.push(input.publicNote);
  }
  lines.push("You can track your complaint anytime using your reference number and contact number.");

  return { subject, text: stripTags(lines), html: wrap(subject, lines) };
}

export function mediationScheduledEmail(input: {
  reference: string;
  kind: string;
  scheduledAt: Date;
  location?: string | null;
  rescheduled?: boolean;
}): EmailMessage {
  const verb = input.rescheduled ? "rescheduled" : "scheduled";
  const subject = `BICATS: Your ${kindLabel(input.kind)} is ${verb}`;

  const lines = [
    `Your ${kindLabel(input.kind)} for complaint <strong>${input.reference}</strong> has been <strong>${verb}</strong>.`,
    `When: <strong>${formatLongWhen(input.scheduledAt)}</strong>`,
  ];
  if (input.location) {
    lines.push(`Where: <strong>${input.location}</strong>`);
  }
  lines.push("Please arrive on time and bring any documents related to your case.");

  return { subject, text: stripTags(lines), html: wrap(subject, lines) };
}

export function mediationCancelledEmail(input: {
  reference: string;
  kind: string;
}): EmailMessage {
  const subject = `BICATS: Your ${kindLabel(input.kind)} was cancelled`;

  const lines = [
    `Your ${kindLabel(input.kind)} for complaint <strong>${input.reference}</strong> has been <strong>cancelled</strong>.`,
    "The barangay will notify you about the next step.",
  ];

  return { subject, text: stripTags(lines), html: wrap(subject, lines) };
}

// Daily pre-session reminder for the complainant.
export function hearingReminderEmail(input: {
  reference: string;
  kind: string;
  scheduledAt: Date;
  location?: string | null;
}): EmailMessage {
  const subject = `BICATS: Reminder - your ${kindLabel(input.kind)} session is within 24 hours`;

  const lines = [
    `Reminder: your ${kindLabel(input.kind)} session for complaint <strong>${input.reference}</strong> starts within 24 hours.`,
    `When: <strong>${formatLongWhen(input.scheduledAt)}</strong>`,
  ];
  if (input.location) {
    lines.push(`Where: <strong>${input.location}</strong>`);
  }
  lines.push("Please arrive on time and bring any documents related to your case.");

  return { subject, text: stripTags(lines), html: wrap(subject, lines) };
}
