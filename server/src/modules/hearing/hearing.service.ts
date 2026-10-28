import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { CustomError } from "../../utils/custom.exception.js";
import notificationService from "../notification/notification.service.js";
import settingService from "../setting/setting.service.js";

import type {
  CreateHearingInput,
  RecordAttendanceInput,
  UpdateHearingInput,
} from "./hearing.schema.js";
import type {
  HearingComplaintOption,
  HearingListFilters,
  HearingRow,
} from "./hearing.types.js";
import {
  assertNoConflict,
  assertNoDuplicateForComplaint,
  assertSchedulingAllowed,
  mapHearing,
} from "./hearing.helpers.js";
import { TERMINAL_STATUSES } from "../complaint/complaint.schema.js";

const hearingSelect = {
  id: true,
  complaintId: true,
  scheduledAt: true,
  kind: true,
  status: true,
  location: true,
  notes: true,
  outcome: true,
  complainantAttendance: true,
  respondentAttendance: true,
  attendanceNotes: true,
  attendanceRecordedAt: true,
  complaint: {
    select: {
      reference: true,
      complainantName: true,
      respondentName: true,
      status: true,
    },
  },
} satisfies Prisma.HearingSelect;

const KIND_LABEL: Record<string, string> = {
  mediation: "Mediation",
  conciliation: "Conciliation",
  hearing: "Arbitration",
};

// A session event belongs on the case timeline, and the barangay reads its
// own clock, so pin the note to Philippine time rather than the server's.
function formatWhen(date: Date): string {
  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });
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
    const settings = await settingService.get();
    return rows.map((row) => mapHearing(row, now, settings.hearingGraceHours));
  },

  async complaintOptions(): Promise<HearingComplaintOption[]> {
    return prisma.complaint.findMany({
      where: { status: { notIn: [...TERMINAL_STATUSES] } },
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
  ): Promise<{
    id: number;
    reference: string;
    location: string | null;
    status: string;
  }> {
    const complaint = await prisma.complaint.findUnique({
      where: { id: input.complaintId },
      select: { id: true, reference: true, status: true },
    });

    if (!complaint) throw new CustomError("Complaint not found", undefined, 404);

    if (TERMINAL_STATUSES.includes(complaint.status)) {
      throw new CustomError(
        "This case is closed. Reopen it before scheduling a session.",
        undefined,
        409,
      );
    }

    // A past time is only accepted when the desk records a session that was
    // actually held; a live booking may not open in the past.
    const heldInPast = input.scheduledAt.getTime() < Date.now();

    if (heldInPast && input.status === "scheduled") {
      throw new CustomError(
        "A session can't be booked for a time that has already passed. Mark it completed or no show to record a session that was already held.",
        { scheduledAt: "Choose a future date and time" },
        400,
      );
    }

    if (!heldInPast && input.status !== "scheduled") {
      throw new CustomError(
        "A session that hasn't been held yet can only be scheduled.",
        { status: "Record its result after the session takes place" },
        400,
      );
    }

    const settings = await settingService.get();

    // Calendar checks only apply to a live booking. A session that was
    // already held is a record of what happened, so its slot is not up for
    // approval.
    if (!heldInPast) {
      assertSchedulingAllowed(input.scheduledAt, settings);
      await assertNoDuplicateForComplaint(input.complaintId, input.scheduledAt);
      await assertNoConflict(input.scheduledAt, settings.hearingDurationMinutes);
    }

    const hearing = await prisma.$transaction(async (tx) => {
      const row = await tx.hearing.create({
        data: {
          complaintId: input.complaintId,
          scheduledAt: input.scheduledAt,
          kind: input.kind,
          status: input.status,
          location: input.location ?? (settings.defaultHearingLocation || null),
          notes: input.notes,
          outcome: input.outcome,
          createdById: userId ?? null,
        },
        select: { id: true, location: true, status: true },
      });

      // Put the booking on the case timeline so staff see the session date
      // next to the rest of the case history.
      await tx.statusUpdate.create({
        data: {
          complaintId: input.complaintId,
          status: complaint.status,
          hearingAt: input.scheduledAt,
          internalNote:
            input.status === "scheduled"
              ? `${KIND_LABEL[input.kind] ?? "Session"} scheduled for ${formatWhen(input.scheduledAt)}.`
              : `${KIND_LABEL[input.kind] ?? "Session"} held on ${formatWhen(input.scheduledAt)} (${input.status.replace("_", " ")}).`,
          createdById: userId ?? null,
        },
      });

      return row;
    });

    return {
      id: hearing.id,
      reference: complaint.reference,
      location: hearing.location,
      status: hearing.status,
    };
  },

  async update(
    id: number,
    input: UpdateHearingInput,
    userId?: number,
  ): Promise<{
    complaintId: number;
    kind: string;
    location: string | null;
    scheduledAt: Date;
    rescheduled: boolean;
    reopened: boolean;
    reference: string;
    previousStatus: string;
  }> {
    const existing = await prisma.hearing.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        kind: true,
        complaintId: true,
        scheduledAt: true,
        location: true,
        outcome: true,
        complaint: { select: { reference: true, status: true } },
      },
    });

    if (!existing) throw new CustomError("Mediation not found", undefined, 404);

    // Work out what the hearing will look like after this save.
    const finalStatus = input.status ?? existing.status;
    const finalTime = input.scheduledAt ?? existing.scheduledAt;
    const timeChanged =
      !!input.scheduledAt &&
      input.scheduledAt.getTime() !== existing.scheduledAt.getTime();
    const kindChanged = !!input.kind && input.kind !== existing.kind;
    const locationChanged =
      input.location !== undefined &&
      input.location !== (existing.location ?? null);
    const outcomeChanged =
      input.outcome !== undefined && input.outcome !== (existing.outcome ?? null);
    const reopening =
      existing.status === "cancelled" && finalStatus !== "cancelled";
    // A cancelled session coming back on the calendar is news for the
    // complainant too, even when the date never moved.
    const reopened =
      existing.status === "cancelled" && finalStatus === "scheduled";

    // A finished session is a record of what happened, and a closed case has
    // no sessions left to move. Both may only have their details corrected.
    const finished =
      existing.status === "completed" || existing.status === "cancelled";
    const caseClosed = TERMINAL_STATUSES.includes(existing.complaint.status);
    const reactivating =
      finalStatus === "scheduled" && existing.status !== "scheduled";

    // Venue and outcome are the record of what happened; only notes stay
    // open once the session is over or the case is closed.
    if ((finished || caseClosed) && (locationChanged || outcomeChanged)) {
      throw new CustomError(
        "This session's venue and outcome can't be changed. Only notes can be added.",
        undefined,
        409,
      );
    }

    if (finished && (timeChanged || kindChanged)) {
      throw new CustomError(
        "A finished session can't be rescheduled. Schedule a new session instead.",
        undefined,
        409,
      );
    }

    if (caseClosed && (timeChanged || kindChanged || reactivating)) {
      throw new CustomError(
        "This case is closed. Reopen it before scheduling a session.",
        undefined,
        409,
      );
    }

    // Only check when it will occupy a slot, and either it moved or it's
    // coming back from cancelled.
    if (finalStatus !== "cancelled" && (timeChanged || reopening)) {
      // A save that ends with a held session records what took place, so
      // neither the past time nor the slot is up for approval. Any other
      // session landing behind today would be overdue the moment it saves.
      const heldFinal =
        finalStatus === "completed" || finalStatus === "no_show";

      if (
        !heldFinal &&
        finalTime.getTime() < Date.now() &&
        (timeChanged || reactivating)
      ) {
        throw new CustomError(
          "A session can't be moved to a time that has already passed.",
          { scheduledAt: "Choose a future date and time" },
          400,
        );
      }

      if (!heldFinal) {
        const settings = await settingService.get();
        assertSchedulingAllowed(finalTime, settings);
        await assertNoDuplicateForComplaint(existing.complaintId, finalTime, id);
        await assertNoConflict(finalTime, settings.hearingDurationMinutes, id);
      }
    }

    const data: Prisma.HearingUpdateInput = {};
    if (input.scheduledAt) data.scheduledAt = input.scheduledAt;
    if (input.kind) data.kind = input.kind;
    if (input.status) data.status = input.status;
    if (input.location !== undefined) data.location = input.location;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.outcome !== undefined) data.outcome = input.outcome;

    const finalKind = input.kind ?? existing.kind;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.hearing.update({
        where: { id },
        data,
        select: { complaintId: true, kind: true, location: true },
      });

      // A move is a case event: record both the old and new schedule so the
      // timeline shows what changed, not just when it changed.
      if (timeChanged) {
        await tx.statusUpdate.create({
          data: {
            complaintId: existing.complaintId,
            status: existing.complaint.status,
            hearingAt: finalTime,
            internalNote: `${KIND_LABEL[finalKind] ?? "Session"} rescheduled from ${formatWhen(existing.scheduledAt)} to ${formatWhen(finalTime)}.`,
            createdById: userId ?? null,
          },
        });
      }

      return row;
    });

    const rescheduled = timeChanged;

    if ((input.status && input.status !== "scheduled") || rescheduled) {
      await notificationService.clearByDedupePrefix(`hearing_overdue:${id}:`);
    }

    return {
      ...updated,
      scheduledAt: finalTime,
      rescheduled,
      reopened,
      reference: existing.complaint.reference,
      previousStatus: existing.status,
    };
  },

  async recordAttendance(
    id: number,
    input: RecordAttendanceInput,
  ): Promise<{
    complaintId: number;
    kind: string;
    reference: string;
    previousStatus: string;
    status: string;
    statusChanged: boolean;
  }> {
    const existing = await prisma.hearing.findUnique({
      where: { id },
      select: {
        complaintId: true,
        kind: true,
        status: true,
        scheduledAt: true,
        complaint: { select: { reference: true, status: true } },
      },
    });

    if (!existing) throw new CustomError("Mediation not found", undefined, 404);

    if (TERMINAL_STATUSES.includes(existing.complaint.status)) {
      throw new CustomError(
        "Attendance can't be recorded because the case is already closed.",
        undefined,
        409,
      );
    }

    if (existing.status === "cancelled") {
      throw new CustomError(
        "Attendance can't be recorded for a cancelled session.",
        undefined,
        409,
      );
    }

    if (existing.scheduledAt.getTime() > Date.now()) {
      throw new CustomError(
        "Attendance can only be recorded after the session's scheduled time.",
        undefined,
        409,
      );
    }

    // Attendance decides the session outcome; re-recording it corrects the
    // outcome too. Staff can still override the status from the edit dialog.
    const nobodyPresent =
      input.complainant !== "present" && input.respondent !== "present";
    const status = nobodyPresent ? "no_show" : "completed";

    await prisma.hearing.update({
      where: { id },
      data: {
        complainantAttendance: input.complainant,
        respondentAttendance: input.respondent,
        attendanceNotes: input.notes,
        attendanceRecordedAt: new Date(),
        ...(status !== existing.status ? { status } : {}),
      },
    });

    await notificationService.clearByDedupePrefix(`hearing_overdue:${id}:`);

    return {
      complaintId: existing.complaintId,
      kind: existing.kind,
      reference: existing.complaint.reference,
      previousStatus: existing.status,
      status,
      statusChanged: status !== existing.status,
    };
  },

  async cancel(
    id: number,
  ): Promise<{
    complaintId: number;
    kind: string;
    reference: string;
    previousStatus: string;
  }> {
    const existing = await prisma.hearing.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) throw new CustomError("Mediation not found", undefined, 404);

    // Cancelling twice is a harmless repeat, but a session that already
    // happened can't be called off after the fact.
    if (existing.status !== "scheduled" && existing.status !== "cancelled") {
      throw new CustomError(
        "Only a scheduled session can be cancelled.",
        undefined,
        409,
      );
    }

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
      previousStatus: existing.status,
    };
  },
};

export default hearingService;
