import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { CustomError } from "../../utils/custom.exception.js";
import notificationService from "../notification/notification.service.js";

import type {
  CreateHearingInput,
  HearingComplaintOption,
  HearingListFilters,
  HearingRow,
  HearingStatus,
  HearingKind,
  UpdateHearingInput,
} from "./hearing.schema.js";
import { isHearingOverdue } from "./hearing.schema.js";

const TERMINAL_STATUSES = ["settled", "certified", "dismissed"];

type HearingRecord = {
  id: number;
  complaintId: number;
  scheduledAt: Date;
  kind: string;
  status: string;
  location: string | null;
  notes: string | null;
  outcome: string | null;
  complaint: {
    reference: string;
    complainantName: string;
    respondentName: string;
  };
};

function mapHearing(record: HearingRecord, now: Date): HearingRow {
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

const hearingSelect = {
  id: true,
  complaintId: true,
  scheduledAt: true,
  kind: true,
  status: true,
  location: true,
  notes: true,
  outcome: true,
  complaint: {
    select: { reference: true, complainantName: true, respondentName: true },
  },
} satisfies Prisma.HearingSelect;

const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // Philippines is UTC+8, no DST
const DAY_MS = 24 * 60 * 60 * 1000;

// Start/end of the calendar day (Philippine time) that contains `date`.
function phDayRange(date: Date) {
  const start =
    Math.floor((date.getTime() + PH_OFFSET_MS) / DAY_MS) * DAY_MS - PH_OFFSET_MS;
  return { gte: new Date(start), lt: new Date(start + DAY_MS) };
}

// A case can have only one live session per day. Reschedule it instead.
async function assertNoDuplicateForComplaint(
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
async function assertNoConflict(scheduledAt: Date, excludeId?: number) {
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

const hearingService = {
  async list(filters: HearingListFilters = {}): Promise<HearingRow[]> {
    const where: Prisma.HearingWhereInput = {
      ...(filters.complaintId ? { complaintId: filters.complaintId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    if (filters.from || filters.to) {
      where.scheduledAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lt: filters.to } : {}),
      };
    }

    const rows = await prisma.hearing.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      select: hearingSelect,
    });

    const now = new Date();
    return rows.map((row) => mapHearing(row, now));
  },

  async complaintOptions(): Promise<HearingComplaintOption[]> {
    return prisma.complaint.findMany({
      where: { status: { notIn: TERMINAL_STATUSES } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        reference: true,
        complainantName: true,
        respondentName: true,
        status: true,
      },
    });
  },

  async create(
    input: CreateHearingInput,
    userId?: number,
  ): Promise<{ id: number; reference: string }> {
    const complaint = await prisma.complaint.findUnique({
      where: { id: input.complaintId },
      select: { id: true, reference: true },
    });

    if (!complaint) throw new CustomError("Complaint not found", undefined, 404);

    await assertNoDuplicateForComplaint(input.complaintId, input.scheduledAt);
    await assertNoConflict(input.scheduledAt);

    const hearing = await prisma.hearing.create({
      data: {
        complaintId: input.complaintId,
        scheduledAt: input.scheduledAt,
        kind: input.kind,
        location: input.location,
        notes: input.notes,
        createdById: userId ?? null,
      },
      select: { id: true },
    });

    return { id: hearing.id, reference: complaint.reference };
  },

  async update(
    id: number,
    input: UpdateHearingInput,
  ): Promise<{
    complaintId: number;
    kind: string;
    rescheduled: boolean;
    reference: string;
    previousStatus: string;
  }> {
    const existing = await prisma.hearing.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        complaintId: true,
        scheduledAt: true,
        complaint: { select: { reference: true } },
      },
    });

    if (!existing) throw new CustomError("Mediation not found", undefined, 404);

    // Work out what the hearing will look like after this save.
    const finalStatus = input.status ?? existing.status;
    const finalTime = input.scheduledAt ?? existing.scheduledAt;
    const timeChanged =
      !!input.scheduledAt &&
      input.scheduledAt.getTime() !== existing.scheduledAt.getTime();
    const reopening =
      existing.status === "cancelled" && finalStatus !== "cancelled";

    // Only check when it will occupy a slot, and either it moved or it's
    // coming back from cancelled.
    if (finalStatus !== "cancelled" && (timeChanged || reopening)) {
      await assertNoDuplicateForComplaint(existing.complaintId, finalTime, id);
      await assertNoConflict(finalTime, id);
    }

    const data: Prisma.HearingUpdateInput = {};
    if (input.scheduledAt) data.scheduledAt = input.scheduledAt;
    if (input.kind) data.kind = input.kind;
    if (input.status) data.status = input.status;
    if (input.location !== undefined) data.location = input.location;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.outcome !== undefined) data.outcome = input.outcome;

    const updated = await prisma.hearing.update({
      where: { id },
      data,
      select: { complaintId: true, kind: true },
    });

    const rescheduled = timeChanged;

    if ((input.status && input.status !== "scheduled") || rescheduled) {
      await notificationService.clearByDedupePrefix(`hearing_overdue:${id}:`);
    }

    return {
      ...updated,
      rescheduled,
      reference: existing.complaint.reference,
      previousStatus: existing.status,
    };
  },

  async cancel(
    id: number,
  ): Promise<{ complaintId: number; kind: string; reference: string }> {
    const updated = await prisma.hearing.update({
      where: { id },
      data: { status: "cancelled" },
      select: {
        complaintId: true,
        kind: true,
        complaint: { select: { reference: true } },
      },
    });

    await notificationService.clearByDedupePrefix(`hearing_overdue:${id}:`);

    return {
      complaintId: updated.complaintId,
      kind: updated.kind,
      reference: updated.complaint.reference,
    };
  },
};

export default hearingService;
