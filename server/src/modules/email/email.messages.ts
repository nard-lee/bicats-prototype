// Email bodies for resident notifications (plain text + simple HTML).
// Subjects and text share wording with SMS so both channels say the same thing.
//
// Subjects carry no product name: the From address already reads "Barangay
// Kabayanihan", and "BICATS" is the internal system, not something a resident
// is corresponding with.

import { formatLongWhen, trackingUrl, type MsgLang } from "../notify/format.js";
import { kindLabel, statusLabel } from "../notify/labels.js";
import type { EmailMessage } from "./email.types.js";

function pick(lang: MsgLang, en: string, tl: string): string {
  return lang === "tl" ? tl : en;
}

// Message lines are plain text everywhere in this module. wrap() is the only
// place that knows HTML, so a staff-authored note or venue can never inject
// markup into the rendered mail.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const UI = {
  en: {
    track: "Track your complaint",
    footer:
      "This is an automated message from Barangay Kabayanihan. Please do not reply.",
  },
  tl: {
    track: "Subaybayan ang inyong reklamo",
    footer:
      "Awtomatikong mensahe mula sa Barangay Kabayanihan. Huwag sumagot.",
  },
} as const;

function wrap(title: string, lines: string[], url: string, lang: MsgLang): string {
  const body = lines.map((line) => `<p style="margin:0 0 12px">${esc(line)}</p>`).join("");

  return `<!doctype html><html><body style="margin:0;background:#f6f6f7;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:24px">
    <h1 style="margin:0 0 16px;font-size:18px">${esc(title)}</h1>
    ${body}
    <p style="margin:0 0 12px"><a href="${esc(url)}">${esc(UI[lang].track)}</a></p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
    <p style="margin:0;font-size:12px;color:#6b7280">${esc(UI[lang].footer)}</p>
  </div>
</body></html>`;
}

function message(lang: MsgLang, subject: string, lines: string[], reference: string): EmailMessage {
  const url = trackingUrl(reference);
  return {
    subject,
    text: [...lines, `${UI[lang].track}: ${url}`].join("\n\n"),
    html: wrap(subject, lines, url, lang),
  };
}

// Staff write notes in one language; a note is delivered exactly as typed.
function note(lines: string[], publicNote?: string | null): string[] {
  return publicNote ? [...lines, publicNote] : lines;
}

export function statusUpdateEmail(input: {
  reference: string;
  status: string;
  publicNote?: string | null;
  hearingAt?: Date | null;
  lang: MsgLang;
}): EmailMessage {
  const label = statusLabel(input.status, input.lang);
  const subject = pick(
    input.lang,
    `Complaint ${input.reference} is now "${label}"`,
    `Reklamo ${input.reference}: "${label}" na`,
  );

  const head = pick(
    input.lang,
    `Your complaint ${input.reference} is now "${label}".`,
    `Ang inyong reklaming ${input.reference} ay "${label}" na.`,
  );

  let lines = [head];
  if (input.hearingAt) {
    const when = formatLongWhen(input.hearingAt, input.lang);
    lines.push(pick(input.lang, `A mediation session is set on ${when}.`, `Itinakda ang mediasyon sa ${when}.`));
  }
  lines = note(lines, input.publicNote);
  lines.push(
    pick(
      input.lang,
      "You can track your complaint anytime with your reference number and contact number.",
      "Maaari ninyong subaybayan ang inyong reklamo anumang oras gamit ang reperensya at numero ng contact ninyo.",
    ),
  );

  return message(input.lang, subject, lines, input.reference);
}

// Receipt the filer gets the moment intake accepts the complaint.
export function intakeReceivedEmail(input: {
  reference: string;
  dueAt?: Date | null;
  lang: MsgLang;
}): EmailMessage {
  const subject = pick(
    input.lang,
    `Complaint ${input.reference} received`,
    `Natanggap ang reklamo ${input.reference}`,
  );

  const lines = [
    pick(
      input.lang,
      `Your complaint ${input.reference} has been received by the Barangay and is now pending action.`,
      `Ang inyong reklaming ${input.reference} ay natanggap na ng Barangay at sinusuri pa lamang.`,
    ),
  ];
  if (input.dueAt) {
    const when = formatLongWhen(input.dueAt, input.lang);
    lines.push(
      pick(
        input.lang,
        `The barangay will act on it on or before ${when}.`,
        `Ang Barangay ay kikilos hinggil dito hindi huli sa ${when}.`,
      ),
    );
  }
  lines.push(
    pick(
      input.lang,
      "Keep this reference number safe. You can track your complaint anytime with this reference and your contact number.",
      "Itago nang maigi ang reperensang ito. Maaari ninyong subaybayan ang inyong reklamo anumang oras gamit ito at ang numero ng contact ninyo.",
    ),
  );

  return message(input.lang, subject, lines, input.reference);
}

export function mediationScheduledEmail(input: {
  reference: string;
  kind: string;
  scheduledAt: Date;
  location?: string | null;
  rescheduled?: boolean;
  lang: MsgLang;
}): EmailMessage {
  const kind = kindLabel(input.kind, input.lang);
  const verb = pick(
    input.lang,
    input.rescheduled ? "rescheduled" : "scheduled",
    input.rescheduled ? "itinakda ulit" : "itinakda",
  );
  const subject = input.rescheduled
    ? pick(input.lang, `Your ${kind} is rescheduled`, `Itinakda ulit ang inyong ${kind}`)
    : pick(input.lang, `Your ${kind} is scheduled`, `Itinakda ang inyong ${kind}`);

  const when = formatLongWhen(input.scheduledAt, input.lang);
  const lines = [
    pick(
      input.lang,
      `Your ${kind} for complaint ${input.reference} has been ${verb}.`,
      `Ang inyong ${kind} para sa reklaming ${input.reference} ay ${verb}.`,
    ),
    pick(input.lang, `When: ${when}`, `Kailan: ${when}`),
  ];
  if (input.location) {
    lines.push(pick(input.lang, `Where: ${input.location}`, `Saan: ${input.location}`));
  }
  lines.push(
    pick(
      input.lang,
      "Please arrive on time and bring any documents related to your case.",
      "Mangyaring dumating sa oras at dalhin ang mga dokumento ng inyong kaso.",
    ),
  );

  return message(input.lang, subject, lines, input.reference);
}

export function mediationCancelledEmail(input: {
  reference: string;
  kind: string;
  lang: MsgLang;
}): EmailMessage {
  const kind = kindLabel(input.kind, input.lang);
  const subject = pick(
    input.lang,
    `Your ${kind} was cancelled`,
    `Kanselado ang inyong ${kind}`,
  );

  const lines = [
    pick(
      input.lang,
      `Your ${kind} for complaint ${input.reference} has been cancelled.`,
      `Ang inyong ${kind} para sa reklaming ${input.reference} ay kanselado.`,
    ),
    pick(
      input.lang,
      "The barangay will notify you about the next step.",
      "Aabisuhan kami ninyo sa susunod na hakbang.",
    ),
  ];

  return message(input.lang, subject, lines, input.reference);
}

// Daily pre-session reminder for the complainant.
export function hearingReminderEmail(input: {
  reference: string;
  kind: string;
  scheduledAt: Date;
  location?: string | null;
  lang: MsgLang;
}): EmailMessage {
  const kind = kindLabel(input.kind, input.lang);
  const subject = pick(
    input.lang,
    `Reminder - your ${kind} session is within 24 hours`,
    `Paalala - ang inyong ${kind} ay sa loob ng 24 oras`,
  );

  const when = formatLongWhen(input.scheduledAt, input.lang);
  const lines = [
    pick(
      input.lang,
      `Reminder: your ${kind} session for complaint ${input.reference} starts within 24 hours.`,
      `Paalala: ang inyong ${kind} para sa reklaming ${input.reference} ay magsisimula sa loob ng 24 oras.`,
    ),
    pick(input.lang, `When: ${when}`, `Kailan: ${when}`),
  ];
  if (input.location) {
    lines.push(pick(input.lang, `Where: ${input.location}`, `Saan: ${input.location}`));
  }
  lines.push(
    pick(
      input.lang,
      "Please arrive on time and bring any documents related to your case.",
      "Mangyaring dumating sa oras at dalhin ang mga dokumento ng inyong kaso.",
    ),
  );

  return message(input.lang, subject, lines, input.reference);
}
