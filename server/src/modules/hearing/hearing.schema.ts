import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => v || null);

// For PATCH: absent = leave unchanged, null = clear.
const patchText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const HEARING_KINDS = ["mediation", "conciliation", "hearing"] as const;
export const HEARING_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type HearingKind = (typeof HEARING_KINDS)[number];
export type HearingStatus = (typeof HEARING_STATUSES)[number];

// Don't flag a session the moment its start time passes; give the barangay
// time to finish the meeting before treating it as a missed one.
export const HEARING_GRACE_MS = 2 * 60 * 60 * 1000;

export function isHearingOverdue(
  scheduledAt: Date,
  status: string,
  now: Date = new Date(),
): boolean {
  return (
    status === "scheduled" &&
    scheduledAt.getTime() + HEARING_GRACE_MS < now.getTime()
  );
}

export const createHearingSchema = z.object({
  complaintId: z.coerce.number().int().positive(),
  scheduledAt: z.coerce.date(),
  kind: z.enum(HEARING_KINDS).default("mediation"),
  location: optionalText(200),
  notes: optionalText(1000),
});

export const updateHearingSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  kind: z.enum(HEARING_KINDS).optional(),
  status: z.enum(HEARING_STATUSES).optional(),
  location: patchText(200),
  notes: patchText(1000),
  outcome: patchText(1000),
});

export const listHearingsSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(HEARING_STATUSES).optional(),
  complaintId: z.coerce.number().int().positive().optional(),
});

export type CreateHearingInput = z.output<typeof createHearingSchema>;
export type UpdateHearingInput = z.output<typeof updateHearingSchema>;

export type HearingListFilters = {
  from?: Date | undefined;
  to?: Date | undefined;
  status?: string | undefined;
  complaintId?: number | undefined;
};

export type HearingRow = {
  id: number;
  complaintId: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  status: HearingStatus;
  scheduledAt: string;
  kind: HearingKind;
  overdue: boolean;
  location: string | null;
  notes: string | null;
  outcome: string | null;
};

export type HearingComplaintOption = {
  id: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  status: string;
};
