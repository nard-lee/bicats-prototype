import type { AttendanceStatus, HearingKind, HearingStatus } from "./loader";

export const KIND_LABEL: Record<HearingKind, string> = {
  mediation: "Mediation",
  conciliation: "Conciliation",
  hearing: "Arbitration",
};

export const STATUS_LABEL: Record<HearingStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export const KIND_STYLE: Record<HearingKind, string> = {
  mediation:
    "border-violet-500/20 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  conciliation:
    "border-indigo-500/20 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  hearing:
    "border-sky-500/20 bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

export const STATUS_STYLE: Record<HearingStatus, string> = {
  scheduled: "border-primary/20 bg-primary/10 text-primary",
  completed: "border-border bg-muted text-muted-foreground",
  cancelled: "border-border bg-muted text-muted-foreground line-through",
  // A recorded negative outcome (red) is visually distinct from the
  // amber "needs action" overdue state.
  no_show: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
};

export const OVERDUE_STYLE =
  "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40";

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  excused: "Excused",
};

export const ATTENDANCE_STYLE: Record<AttendanceStatus, string> = {
  present:
    "border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  absent:
    "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  excused:
    "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export const ATTENDANCE_DOT: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500",
  absent: "bg-red-500",
  excused: "bg-amber-500",
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
