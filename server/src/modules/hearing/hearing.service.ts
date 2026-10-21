import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { CustomError } from "../../utils/custom.exception.js";
import notificationService from "../notification/notification.service.js";

import type { CreateHearingInput, UpdateHearingInput } from "./hearing.schema.js";
import type {
  HearingComplaintOption,
  HearingListFilters,
  HearingRow,
} from "./hearing.types.js";
import {
  assertNoConflict,
  assertNoDuplicateForComplaint,
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
  complaint: {
    select: { reference: true, complainantName: true, respondentName: true },
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
