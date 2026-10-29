import type { AttendanceStatus, HearingKind, HearingStatus } from "./loader";
import {
  DOT_ACTION,
  DOT_NEUTRAL,
  STATUS_ACTION,
  STATUS_ACTIVE,
  STATUS_NEUTRAL,
} from "@/lib/status";

export const KIND_LABEL: Record<HearingKind, string> = {
  mediation: "Mediation",
  conciliation: "Conciliation",
  hearing: "Arbitration",
};

// The calendar chip has room for neither the kind nor a color per kind, so it
// gets three letters instead.
export const KIND_ABBREV: Record<HearingKind, string> = {
  mediation: "Med",
  conciliation: "Con",
  hearing: "Arb",
};

export const STATUS_LABEL: Record<HearingStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export const STATUS_STYLE: Record<HearingStatus, string> = {
  scheduled: STATUS_ACTIVE,
  completed: STATUS_NEUTRAL,
  cancelled: `${STATUS_NEUTRAL} line-through`,
  // A recorded negative outcome shares the red of a session that still needs
  // one; the word says which.
  no_show: STATUS_ACTION,
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  excused: "Excused",
};

// Only a non-attendance is a problem; showing up and being excused are both
// settled, so neither gets a color.
export const ATTENDANCE_STYLE: Record<AttendanceStatus, string> = {
  present: STATUS_NEUTRAL,
  absent: STATUS_ACTION,
  excused: STATUS_NEUTRAL,
};

export const ATTENDANCE_DOT: Record<AttendanceStatus, string> = {
  present: DOT_NEUTRAL,
  absent: DOT_ACTION,
  excused: DOT_NEUTRAL,
};

const attendanceWord: Record<AttendanceStatus, string> = {
  present: "present",
  absent: "absent",
  excused: "excused",
};

// One compact line instead of a badge pair per party; the full record stays
// in the attendance dialog.
export function attendanceSummary(
  complainant: AttendanceStatus | null,
  respondent: AttendanceStatus | null,
): { text: string; tone: AttendanceStatus } | null {
  if (!complainant && !respondent) return null;

  if (complainant && respondent) {
    if (complainant === respondent) {
      return {
        text: `Both ${attendanceWord[complainant]}`,
        tone: complainant,
      };
    }
    if (complainant === "present") {
      return {
        text: `Respondent ${attendanceWord[respondent]}`,
        tone: respondent,
      };
    }
    if (respondent === "present") {
      return {
        text: `Complainant ${attendanceWord[complainant]}`,
        tone: complainant,
      };
    }
    return {
      text: `Complainant ${attendanceWord[complainant]} · respondent ${attendanceWord[respondent]}`,
      tone: complainant === "absent" || respondent === "absent" ? "absent" : "excused",
    };
  }

  const [party, status] = complainant
    ? (["Complainant", complainant] as const)
    : (["Respondent", respondent!] as const);

  return { text: `${party} ${attendanceWord[status]}`, tone: status };
}
