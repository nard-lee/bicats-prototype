import { prisma } from "../../db.js";
import { CustomError } from "../../utils/custom.exception.js";

import { isHearingOverdue } from "./hearing.schema.js";
import type {
  HearingKind,
  HearingRecord,
  HearingRow,
  HearingStatus,
} from "./hearing.types.js";

export function mapHearing(record: HearingRecord, now: Date): HearingRow {
  return {
    id: record.id,
    complaintId: record.complaintId,
    reference: record.complaint.reference,
    complainantName: record.complaint.complainantName,
    respondentName: record.complaint.respondentName,
    scheduledAt: record.scheduledAt.toISOString(),
    kind: record.kind as HearingKind,
    status: record.status as HearingStatus,
    overdue: isHearingOverdue(record.scheduledAt, record.status, now),
    location: record.location,
    notes: record.notes,
    outcome: record.outcome,
  };
}

const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // Philippines is UTC+8, no DST
const DAY_MS = 24 * 60 * 60 * 1000;

// Start/end of the calendar day (Philippine time) that contains `date`.
export function phDayRange(date: Date) {
  const start =
    Math.floor((date.getTime() + PH_OFFSET_MS) / DAY_MS) * DAY_MS - PH_OFFSET_MS;
  return { gte: new Date(start), lt: new Date(start + DAY_MS) };
}

// A case can have only one live session per day. Reschedule it instead.
export async function assertNoDuplicateForComplaint(
  complaintId: number,
  scheduledAt: Date,
  excludeId?: number,
) {
  const duplicate = await prisma.hearing.findFirst({
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

// One hearing at a time: block the exact same slot unless it's been cancelled.
export async function assertNoConflict(scheduledAt: Date, excludeId?: number) {
  const conflict = await prisma.hearing.findFirst({
    where: {
      status: "scheduled",
      scheduledAt,
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
