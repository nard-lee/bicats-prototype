// Resident-facing wording shared by SMS and email so both channels stay in sync.
// Tagalog uses the Katarungang Pambarangay terms in ordinary barangay use
// (mediasyon, konkilyasyon, arbitrasyon) rather than literal translations.

import type { MsgLang } from "./format.js";

const STATUS_LABELS: Record<MsgLang, Record<string, string>> = {
  en: {
    received: "received",
    summoned: "summoned",
    mediation: "in mediation",
    conciliation: "in conciliation",
    settled: "settled",
    certified: "certified for filing",
    dismissed: "dismissed",
  },
  tl: {
    received: "natanggap",
    summoned: "may summons",
    mediation: "nasa mediasyon",
    conciliation: "nasa konkilyasyon",
    settled: "may kasunduan",
    certified: "sertipikado para isampa",
    dismissed: "tinanggihan",
  },
};

const KIND_LABELS: Record<MsgLang, Record<string, string>> = {
  en: {
    mediation: "mediation",
    conciliation: "conciliation",
    hearing: "arbitration",
  },
  tl: {
    mediation: "mediasyon",
    conciliation: "konkilyasyon",
    hearing: "arbitrasyon",
  },
};

export function kindLabel(kind: string, lang: MsgLang): string {
  return KIND_LABELS[lang][kind] ?? kind;
}

export function statusLabel(status: string, lang: MsgLang): string {
  return STATUS_LABELS[lang][status] ?? status;
}
