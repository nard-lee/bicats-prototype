import { prisma } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { CustomError } from "../../utils/custom.exception.js";

import { isHearingOverdue, HEARING_GRACE_HOURS } from "./hearing.schema.js";
import type {
  AttendanceStatus,
  HearingKind,
  HearingRecord,
  HearingRow,
  HearingStatus,
} from "./hearing.types.js";

export function mapHearing(
  record: HearingRecord,
  now: Date,
  graceHours: number = HEARING_GRACE_HOURS,
): HearingRow {
  return {
    id: record.id,
    complaintId: record.complaintId,
    reference: record.complaint.reference,
    complainantName: record.complaint.complainantName,
    respondentName: record.complaint.respondentName,
    complaintStatus: record.complaint.status,
    scheduledAt: record.scheduledAt.toISOString(),
    kind: record.kind as HearingKind,
    status: record.status as HearingStatus,
    overdue: isHearingOverdue(
      record.scheduledAt,
      record.status,
      now,
      graceHours,
    ),
    started: record.scheduledAt.getTime() <= now.getTime(),
    location: record.location,
    notes: record.notes,
    outcome: record.outcome,
    complainantAttendance:
      (record.complainantAttendance as AttendanceStatus | null) ?? null,
    respondentAttendance:
      (record.respondentAttendance as AttendanceStatus | null) ?? null,
    attendanceNotes: record.attendanceNotes,
    attendanceRecordedAt: record.attendanceRecordedAt
      ? record.attendanceRecordedAt.toISOString()
      : null,
  };
}

const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // Philippines is UTC+8, no DST
const DAY_MS = 24 * 60 * 60 * 1000;

type ScheduleSettings = {
  hearingDurationMinutes: number;
  enforceOfficeHours: boolean;
  officeStartHour: number;
  officeEndHour: number;
};

function officeHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

// Office hours are Philippine time, matching how the barangay posts them.
export function assertSchedulingAllowed(
  scheduledAt: Date,
  settings: ScheduleSettings,
): void {
  if (!settings.enforceOfficeHours) return;

  const ph = new Date(scheduledAt.getTime() + PH_OFFSET_MS);
  const startMinutes = ph.getUTCHours() * 60 + ph.getUTCMinutes();
  const opens = settings.officeStartHour * 60;
  const closes = settings.officeEndHour * 60;
  const ends = startMinutes + settings.hearingDurationMinutes;
  const window = `${officeHourLabel(settings.officeStartHour)}–${officeHourLabel(settings.officeEndHour)}`;

  if (startMinutes < opens || ends > closes) {
    throw new CustomError(
      `Sessions must fit within office hours (${window}, Philippine time).`,
      { scheduledAt: `Choose a time within ${window}` },
      400,
    );
  }
}

// Start/end of the calendar day (Philippine time) that contains `date`.
export function phDayRange(date: Date) {
  const start =
    Math.floor((date.getTime() + PH_OFFSET_MS) / DAY_MS) * DAY_MS - PH_OFFSET_MS;
  return { gte: new Date(start), lt: new Date(start + DAY_MS) };
}

type HearingDb = Prisma.TransactionClient | typeof prisma;

// A case can have only one live session per day. Reschedule it instead.
export async function assertNoDuplicateForComplaint(
  complaintId: number,
  scheduledAt: Date,
  excludeId?: number,
  db: HearingDb = prisma,
) {
  const duplicate = await db.hearing.findFirst({
    where: {
      complaintId,
      scheduledAt: phDayRange(scheduledAt),
      status: { not: "cancelled" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new CustomError(
      "This case already has a session on that day. Edit it to reschedule instead.",
      { scheduledAt: "This case already has a session that day" },
      409,
    );
  }
}

// One hearing at a time: block overlapping slots unless they're cancelled.
// Back-to-back sessions are allowed; the window is the configured duration.
export async function assertNoConflict(
  scheduledAt: Date,
  durationMinutes: number,
  excludeId?: number,
  db: HearingDb = prisma,
) {
  const windowMs = durationMinutes * 60 * 1000;
  const conflict = await db.hearing.findFirst({
    where: {
      status: "scheduled",
      scheduledAt: {
        gt: new Date(scheduledAt.getTime() - windowMs),
        lt: new Date(scheduledAt.getTime() + windowMs),
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (conflict) {
    throw new CustomError(
      "Another mediation session is already scheduled at that time",
      { scheduledAt: "That slot is already taken" },
      409,
    );
  }
}
