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

const TERMINAL_STATUSES = ["settled", "certified", "dismissed"];

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

    const settings = await settingService.get();
    assertSchedulingAllowed(input.scheduledAt, settings);

    await assertNoDuplicateForComplaint(input.complaintId, input.scheduledAt);
    await assertNoConflict(
      input.scheduledAt,
      settings.hearingDurationMinutes,
    );

    const hearing = await prisma.hearing.create({
      data: {
        complaintId: input.complaintId,
        scheduledAt: input.scheduledAt,
        kind: input.kind,
        location: input.location ?? (settings.defaultHearingLocation || null),
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
      const settings = await settingService.get();
      assertSchedulingAllowed(finalTime, settings);
      await assertNoDuplicateForComplaint(existing.complaintId, finalTime, id);
      await assertNoConflict(finalTime, settings.hearingDurationMinutes, id);
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
  ): Promise<{ complaintId: number; kind: string; reference: string }> {
    const existing = await prisma.hearing.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) throw new CustomError("Mediation not found", undefined, 404);

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
