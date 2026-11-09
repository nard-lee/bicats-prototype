import type { Key } from "./I18n";

// A session's type follows the case's stage, exactly the way the server
// derives it. Kept out of the mediation page so the case detail, the Overview
// and the public tracker can all name a session date without importing admin
// code.
export type HearingKind = "mediation" | "conciliation" | "hearing";

export function kindForStatus(status: string): HearingKind {
  if (status === "conciliation") return "conciliation";
  if (status === "arbitration") return "hearing";
  return "mediation";
}

export const KIND_KEY: Record<HearingKind, Key> = {
  mediation: "kindMediation",
  conciliation: "kindConciliation",
  hearing: "kindArbitration",
};

// A dated history entry is labelled by the session booked on that day, which
// keeps the type it was booked under even after the case moves on. The entry's
// own stage is used only when that session has since moved to another day.
export function kindKeyForEntry(entry: {
  status: string;
  hearingKind?: HearingKind | null;
}): Key {
  return KIND_KEY[entry.hearingKind ?? kindForStatus(entry.status)];
}
