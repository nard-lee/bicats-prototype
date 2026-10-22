import { z } from "zod";

import {
    eligibilityIssueField,
    evaluateEligibility,
    intakeEligibilitySchema,
    toEligibilityAnswers,
} from "./complaint.eligibility.js";
import type {
    ComplaintPriority,
    ComplaintRisk,
    ComplaintStatus,
    DeadlineDays,
} from "./complaint.types.js";

export function normalizePhone(input: string) {
    let digits = input.replace(/\D/g, "");
    if (digits.startsWith("63") && digits.length === 12) {
        digits = "0" + digits.slice(2);
    }
    return digits;
}

const optionalText = (max: number) =>
    z.string().trim().max(max).optional().transform((v) => v || null);

export const createComplaintSchema = z
    .object({
        complainantName: z.string("required").trim().min(2).max(100),
        complainantAge: z.coerce.number().int().min(1).max(120),
        complainantPurok: z.string().trim().min(1).max(50),
        complainantContact: z.string().trim().min(7).max(20),
        complainantAddress: z.string().trim().min(3).max(200),

        respondentName: z.string().trim().min(1).max(100),
        respondentAddress: optionalText(200),
        relationship: optionalText(100),

        // Optional: only present when the complainant chooses to give one.
        complainantEmail: z.preprocess(
            (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
            z.string().trim().email().max(150).optional(),
        ).transform((value) => value ?? null),

        complaintType: z.string().min(1),
        complaintTypeOther: optionalText(150),
        incidentAt: z.coerce
            .date()
            .refine((d) => d <= new Date(), "The incident can't be in the future"),
        incidentPlace: z.string().trim().min(2).max(200),
        narrative: z.string().trim().min(10).max(5000),

        ...intakeEligibilitySchema.shape,

        consent: z.literal("on", { error: "You must agree before submitting" }),
    })
    .refine((d) => /^09\d{9}$/.test(normalizePhone(d.complainantContact)), {
        path: ["complainantContact"],
        message: "Enter a valid mobile number, like 0917 000 0000",
    })
    .refine(
        (d) =>
            d.complaintType !== "type12" ||
            (d.complaintTypeOther?.trim().length ?? 0) >= 3,
        {
            path: ["complaintTypeOther"],
            message: "Please describe the complaint type",
        },
    )
    .superRefine((d, ctx) => {
        if (d.eligResidency === "different_city" && !d.eligAdjoining) {
            ctx.addIssue({
                code: "custom",
                path: ["eligAdjoining"],
                message: "Answer this question",
            });
        }
        if (d.eligProperty === "yes" && !d.eligPropertyAgreement) {
            ctx.addIssue({
                code: "custom",
                path: ["eligPropertyAgreement"],
                message: "Answer this question",
            });
        }

        const evaluation = evaluateEligibility(toEligibilityAnswers(d));
        if (evaluation.status === "outside_kp" && evaluation.reason) {
            ctx.addIssue({
                code: "custom",
                path: [eligibilityIssueField(evaluation.reason)],
                message:
                    "This complaint appears to be outside the barangay's authority",
            });
        }
    })
    .transform(({
        consent: _consent,
        eligResidency,
        eligAdjoining,
        eligGovernment,
        eligOffense,
        eligProperty,
        eligPropertyAgreement,
        ...d
    }) => {
        const eligibilityAnswers = toEligibilityAnswers({
            eligResidency,
            eligAdjoining,
            eligGovernment,
            eligOffense,
            eligProperty,
            eligPropertyAgreement,
        });

        return {
            ...d,
            contactNormalized: normalizePhone(d.complainantContact),
            complaintTypeOther:
                d.complaintType === "type12" ? d.complaintTypeOther : null,
            eligibilityAnswers,
            eligibilityStatus: evaluateEligibility(eligibilityAnswers).status,
        };
    });

export const trackComplaintSchema = z.object({
    reference: z.string().trim().min(1).max(50).transform((v) => v.toUpperCase()),
    phone: z.string().trim().min(7).max(20),
});

export const COMPLAINT_STATUSES = [
  "received",
  "summoned",
  "mediation",
  "conciliation",
  "settled",
  "certified",
  "dismissed",
] as const;

// Cases that no longer have a pending step (no deadline).
export const TERMINAL_STATUSES: readonly ComplaintStatus[] = [
  "settled",
  "certified",
  "dismissed",
];

// The KP stage graph. Closed cases have no forward moves; they must be reopened.
export const COMPLAINT_TRANSITIONS: Record<
  ComplaintStatus,
  readonly ComplaintStatus[]
> = {
  received: ["summoned", "dismissed"],
  summoned: ["mediation", "dismissed"],
  mediation: ["settled", "conciliation", "dismissed"],
  conciliation: ["settled", "certified", "dismissed"],
  settled: [],
  certified: [],
  dismissed: [],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = COMPLAINT_TRANSITIONS[from as ComplaintStatus];
  return !!allowed && allowed.includes(to as ComplaintStatus);
}

// ---- Priority triage ----
export const COMPLAINT_PRIORITIES = ["none", "low", "normal", "high", "urgent"] as const;

const PRIORITY_RANK: Record<ComplaintPriority, number> = {
  none: 0,
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4,
};

export function priorityRank(priority: string): number {
  return PRIORITY_RANK[priority as ComplaintPriority] ?? PRIORITY_RANK.normal;
}

// Which priority an overdue case escalates to. Never downgrades, so returns
// null when the case is already at or above the target level.
export function escalatedPriority(
  current: string,
  overdueDays: number,
): ComplaintPriority | null {
  const desired: ComplaintPriority = overdueDays >= 7 ? "urgent" : "high";
  return priorityRank(desired) > priorityRank(current) ? desired : null;
}

export const updatePrioritySchema = z.object({
  priority: z.enum(COMPLAINT_PRIORITIES),
});

// Katarungang Pambarangay flow: for each status, how many days the barangay
// has to take the next step (see the KP rules cited in the barangay handbook).
export const KP_DEADLINE_DAYS: DeadlineDays = {
  received: 1, // summon the respondent by the next working day
  summoned: 15, // hold mediation within 15 days of the summons
  mediation: 15, // conclude mediation (from the first meeting of the parties)
  conciliation: 15, // conclude the Pangkat conciliation
};

// Build the deadline rules from the admin-configurable barangay settings.
export type DeadlineConfig = {
  days: DeadlineDays;
  workingDaysOnly?: boolean;
  holidays?: string[];
};

export function deadlineConfigFrom(settings: {
  deadlineReceived: number;
  deadlineSummoned: number;
  deadlineMediation: number;
  deadlineConciliation: number;
  workingDaysOnly?: boolean;
  holidays?: string[];
}): DeadlineConfig {
  return {
    days: {
      received: settings.deadlineReceived,
      summoned: settings.deadlineSummoned,
      mediation: settings.deadlineMediation,
      conciliation: settings.deadlineConciliation,
    },
    workingDaysOnly: settings.workingDaysOnly ?? false,
    holidays: settings.holidays ?? [],
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

function phDayKey(date: Date): string {
  return new Date(date.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
}

function isWorkingDay(date: Date, holidays: Set<string>): boolean {
  const weekday = new Date(date.getTime() + PH_OFFSET_MS).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(phDayKey(date));
}

// Deadline for the step required by the given status, measured from `from`.
// Working-day mode keeps the time of day and skips weekends and holidays.
export function computeNextDueAt(
  status: string,
  from: Date = new Date(),
  config: DeadlineConfig = { days: KP_DEADLINE_DAYS },
): Date | null {
  const value = config.days[status as ComplaintStatus];
  if (value === undefined) return null;

  if (!config.workingDaysOnly) {
    return new Date(from.getTime() + value * DAY_MS);
  }

  const holidays = new Set(config.holidays ?? []);
  const cursor = new Date(from);
  let remaining = value;
  while (remaining > 0) {
    cursor.setTime(cursor.getTime() + DAY_MS);
    if (isWorkingDay(cursor, holidays)) remaining -= 1;
  }
  return cursor;
}

// A case is "due soon" when its deadline falls within this window.
export const RISK_WINDOW_DAYS = 3;

// Simple decision-support signal used by reminders and dashboards.
export function complaintRisk(
  dueAt: Date | null,
  status: string,
  windowDays: number = RISK_WINDOW_DAYS,
): ComplaintRisk {
  if (!dueAt) return "none";
  if (TERMINAL_STATUSES.includes(status as ComplaintStatus)) return "none";

  const now = Date.now();
  if (dueAt.getTime() < now) return "overdue";
  if (dueAt.getTime() <= now + windowDays * 24 * 60 * 60 * 1000) {
    return "due_soon";
  }
  return "on_track";
}

export type CreateComplaintInput = z.output<typeof createComplaintSchema>;
