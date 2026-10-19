import { prisma } from "../../db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { CustomError } from "../../utils/custom.exception.js";

import type {
  CreateHearingInput,
  HearingComplaintOption,
  HearingListFilters,
  HearingRow,
  HearingStatus,
  HearingKind,
  UpdateHearingInput,
} from "./hearing.schema.js";

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

function mapHearing(record: HearingRecord): HearingRow {
  return {
    id: record.id,
    complaintId: record.complaintId,
    reference: record.complaint.reference,
    complainantName: record.complaint.complainantName,
    respondentName: record.complaint.respondentName,
    scheduledAt: record.scheduledAt.toISOString(),
    kind: record.kind as HearingKind,
    status: record.status as HearingStatus,
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

    return rows.map(mapHearing);
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
  ): Promise<{ id: number }> {
    const complaint = await prisma.complaint.findUnique({
      where: { id: input.complaintId },
      select: { id: true },
    });

    if (!complaint) throw new CustomError("Complaint not found", undefined, 404);

    await assertNoConflict(input.scheduledAt);

    return prisma.hearing.create({
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
  },

  async update(id: number, input: UpdateHearingInput): Promise<{ complaintId: number; kind: string }> {
    const existing = await prisma.hearing.findUnique({
      where: { id },
      select: { id: true, status: true, complaintId: true },
    });

    if (!existing) throw new CustomError("Mediation not found", undefined, 404);

    const becomingCancelled = input.status === "cancelled";
    if (input.scheduledAt && !becomingCancelled && existing.status !== "cancelled") {
      await assertNoConflict(input.scheduledAt, id);
    }

    const data: Prisma.HearingUpdateInput = {};
    if (input.scheduledAt) data.scheduledAt = input.scheduledAt;
    if (input.kind) data.kind = input.kind;
    if (input.status) data.status = input.status;
    if (input.location !== undefined) data.location = input.location;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.outcome !== undefined) data.outcome = input.outcome;

    return prisma.hearing.update({
      where: { id },
      data,
      select: { complaintId: true, kind: true },
    });
  },

  async cancel(id: number): Promise<{ complaintId: number; kind: string }> {
    return prisma.hearing.update({
      where: { id },
      data: { status: "cancelled" },
      select: { complaintId: true, kind: true },
    });
  },
};

export default hearingService;
