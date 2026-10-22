import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((v) => v || null);

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
export const ATTENDANCE_STATUSES = ["present", "absent", "excused"] as const;

// Don't flag a session the moment its start time passes; give the barangay
// time to finish the meeting before treating it as a missed one.
export const HEARING_GRACE_HOURS = 2;

export function isHearingOverdue(
  scheduledAt: Date,
  status: string,
  now: Date = new Date(),
  graceHours: number = HEARING_GRACE_HOURS,
): boolean {
  return (
    status === "scheduled" &&
    scheduledAt.getTime() + graceHours * 60 * 60 * 1000 < now.getTime()
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

export const recordAttendanceSchema = z.object({
  complainant: z.enum(ATTENDANCE_STATUSES, {
    error: "Select the complainant's attendance",
  }),
  respondent: z.enum(ATTENDANCE_STATUSES, {
    error: "Select the respondent's attendance",
  }),
  notes: optionalText(1000),
});

export const listHearingsSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(HEARING_STATUSES).optional(),
  complaintId: z.coerce.number().int().positive().optional(),
});

export type CreateHearingInput = z.output<typeof createHearingSchema>;
export type UpdateHearingInput = z.output<typeof updateHearingSchema>;
export type RecordAttendanceInput = z.output<typeof recordAttendanceSchema>;
