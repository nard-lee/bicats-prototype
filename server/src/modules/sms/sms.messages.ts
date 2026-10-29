// Message builders for resident SMS. Keep each message short; templates are
// plain text (no HTML) and stay under the 670-character UniSMS limit enforced
// in sms.service.ts.
//
// The registered sender ID ("KABAYANIHAN") is what the phone shows as the
// originator, so the body does not repeat a barangay name — every character
// here is billed.

import { formatShortWhen, trackingUrl, type MsgLang } from "../notify/format.js";
import { kindLabel, statusLabel } from "../notify/labels.js";

function pick(lang: MsgLang, en: string, tl: string): string {
  return lang === "tl" ? tl : en;
}

// Staff write notes in one language; a note is delivered exactly as typed.
function note(input: { publicNote?: string | null }): string[] {
  return input.publicNote ? [input.publicNote] : [];
}

function venue(input: { location?: string | null }, lang: MsgLang): string[] {
  return input.location
    ? [pick(lang, `Venue: ${input.location}.`, `Lugar: ${input.location}.`)]
    : [];
}

// Every message ends by pointing at the case, then telling the filer not to
// answer a number that cannot receive replies.
function closing(lang: MsgLang, reference: string): string[] {
  return [
    pick(lang, `Track it: ${trackingUrl(reference)}`, `Subaybayan: ${trackingUrl(reference)}`),
    pick(lang, "Do not reply.", "Huwag sumagot."),
  ];
}

export function statusUpdateSms(input: {
  reference: string;
  status: string;
  publicNote?: string | null;
  hearingAt?: Date | null;
  lang: MsgLang;
}): string {
  const label = statusLabel(input.status, input.lang);
  const parts = [
    pick(
      input.lang,
      `Your complaint ${input.reference} is now "${label}".`,
      `Ang inyong reklaming ${input.reference} ay "${label}" na.`,
    ),
  ];

  if (input.hearingAt) {
    const when = formatShortWhen(input.hearingAt, input.lang);
    parts.push(pick(input.lang, `Mediation set on ${when}.`, `Itinakda ang mediasyon sa ${when}.`));
  }

  return [...parts, ...note(input), ...closing(input.lang, input.reference)].join(" ");
}

// Receipt the filer gets the moment intake accepts the complaint.
export function intakeReceivedSms(input: {
  reference: string;
  dueAt?: Date | null;
  lang: MsgLang;
}): string {
  const parts = [
    pick(
      input.lang,
      `Your complaint ${input.reference} has been received and is pending action.`,
      `Ang inyong reklaming ${input.reference} ay natanggap na at sinusuri pa ng Barangay.`,
    ),
  ];

  if (input.dueAt) {
    const when = formatShortWhen(input.dueAt, input.lang);
    parts.push(
      pick(
        input.lang,
        `We will act on it on or before ${when}.`,
        `Sasagutin ito ng Barangay hindi huli sa ${when}.`,
      ),
    );
  }

  parts.push(
    pick(input.lang, "Keep this reference.", "Itago ang reperensang ito."),
    ...closing(input.lang, input.reference),
  );

  return parts.join(" ");
}

export function mediationScheduledSms(input: {
  reference: string;
  kind: string;
  scheduledAt: Date;
  location?: string | null;
  rescheduled?: boolean;
  lang: MsgLang;
}): string {
  const when = formatShortWhen(input.scheduledAt, input.lang);
  const kind = kindLabel(input.kind, input.lang);
  const parts = [
    input.rescheduled
      ? pick(
          input.lang,
          `Your ${kind} for ${input.reference} is rescheduled on ${when}.`,
          `Ang inyong ${kind} para sa ${input.reference} ay itinakda ulit sa ${when}.`,
        )
      : pick(
          input.lang,
          `Your ${kind} for ${input.reference} is scheduled on ${when}.`,
          `Ang inyong ${kind} para sa ${input.reference} ay itinakda sa ${when}.`,
        ),
    ...venue(input, input.lang),
    pick(input.lang, "Please arrive on time.", "Mangyaring dumating sa oras."),
    ...closing(input.lang, input.reference),
  ];

  return parts.join(" ");
}

export function mediationCancelledSms(input: {
  reference: string;
  kind: string;
  lang: MsgLang;
}): string {
  const kind = kindLabel(input.kind, input.lang);
  return [
    pick(
      input.lang,
      `Your ${kind} for ${input.reference} has been cancelled. We will inform you of the next step.`,
      `Ang inyong ${kind} para sa ${input.reference} ay kanselado. Iaabiso namin ang susunod na hakbang.`,
    ),
    ...closing(input.lang, input.reference),
  ].join(" ");
}

// Daily pre-session reminder for the complainant.
export function hearingReminderSms(input: {
  reference: string;
  kind: string;
  scheduledAt: Date;
  location?: string | null;
  lang: MsgLang;
}): string {
  const when = formatShortWhen(input.scheduledAt, input.lang);
  const kind = kindLabel(input.kind, input.lang);
  const parts = [
    pick(
      input.lang,
      `Reminder: your ${kind} session for ${input.reference} starts within 24 hours, on ${when}.`,
      `Paalala: ang inyong ${kind} para sa ${input.reference} ay magsisimula sa loob ng 24 oras, sa ${when}.`,
    ),
    ...venue(input, input.lang),
    pick(
      input.lang,
      "Bring any documents related to your case. Please arrive on time.",
      "Dalhin ang mga dokumento ng inyong kaso. Mangyaring dumating sa oras.",
    ),
    ...closing(input.lang, input.reference),
  ];

  return parts.join(" ");
}
