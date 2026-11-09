import { z } from "zod";

import {
    eligibilityIssueField,
    evaluateEligibility,
    intakeEligibilitySchema,
    toEligibilityAnswers,
} from "./complaint.eligibility.js";
import type {
    ComplaintRisk,
    ComplaintStatus,
    ComplaintType,
    DeadlineDays,
} from "./complaint.types.js";

// Public intake types; keep in sync with the client's type1..type12 labels.
export const COMPLAINT_TYPES = [
    "type1",
    "type2",
    "type3",
    "type4",
    "type5",
    "type6",
    "type7",
    "type8",
    "type9",
    "type10",
    "type11",
    "type12",
] as const;

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
        // Minors file through a parent or guardian at the hall; the online desk
        // has no way to record who is actually filing on their behalf.
        complainantAge: z.coerce
            .number()
            .int()
            .min(18, "You must be 18 or older to file online. A parent or guardian can file at the barangay hall.")
            .max(120, "Enter a valid age"),
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

        complaintType: z.enum(COMPLAINT_TYPES),
        complaintTypeOther: optionalText(150),
        incidentAt: z.coerce
            .date()
            .refine((d) => d <= new Date(), "The incident can't be in the future"),
        incidentPlace: z.string().trim().min(2).max(200),
        narrative: z.string().trim().min(10).max(5000),

        // The language the filing form was in. A stale bundle that never sends
        // it just gets English notices.
        complainantLang: z.enum(["en", "tl"]).default("en"),

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

// The Pangkat is three lupon members chosen by the parties; one of them is
// elected chairman. The roster lives in settings, the chosen panel lives on
// the case.
export const updatePangkatSchema = z.object({
  memberIds: z
    .array(z.coerce.number().int().positive())
    .length(3, "Select exactly three Lupon members"),
  chairmanId: z.coerce.number().int().positive({
    error: "Select the Pangkat chairman",
  }),
});

export const COMPLAINT_STATUSES = [
  "received",
  "summoned",
  "mediation",
  "conciliation",
  "arbitration",
  "settled",
  "certified",
  "dismissed",
] as const;

// Sec. 413 gives the parties two arbiters: the Punong Barangay alone (a) when
// the case reaches arbitration before a Pangkat exists, and the Pangkat itself
// (b) once one has been constituted. Staff pick which at the move into the
// stage; the choice is never revisited.
export const ARBITRATION_MODES = ["punong_barangay", "pangkat"] as const;

export type ArbitrationMode = (typeof ARBITRATION_MODES)[number];

// The mode and the date on the parties' written agreement travel together, and
// both belong to the request that enters arbitration.
export const updateArbitrationSchema = z
  .object({
    arbitrationBy: z.enum(ARBITRATION_MODES, {
      error: "Choose who hears the arbitration",
    }),
    arbitrationAgreementAt: z.coerce.date({
      error: "Enter the date the parties agreed in writing to arbitrate",
    }),
  })
  .refine((d) => d.arbitrationAgreementAt <= new Date(), {
    path: ["arbitrationAgreementAt"],
    message: "The agreement can't be dated in the future",
  });

// Cases that no longer have a pending step (no deadline).
export const TERMINAL_STATUSES: readonly ComplaintStatus[] = [
  "settled",
  "certified",
  "dismissed",
];

// The KP stage graph. Closed cases have no forward moves; they must be reopened.
// Sec. 413 lets the parties agree in writing to arbitration "at any stage of the
// proceedings", so the move is offered from mediation and from conciliation, and
// never from intake: a case that has not yet been heard has no proceeding to
// arbitrate. Which arbiter hears it is chosen on that move — the Punong Barangay
// alone needs no panel, the Pangkat does.
export const COMPLAINT_TRANSITIONS: Record<
  ComplaintStatus,
  readonly ComplaintStatus[]
> = {
  received: ["summoned", "dismissed"],
  summoned: ["mediation", "dismissed"],
  mediation: ["settled", "conciliation", "arbitration", "dismissed"],
  conciliation: ["settled", "arbitration", "certified", "dismissed"],
  arbitration: ["settled", "certified", "dismissed"],
  settled: [],
  certified: [],
  dismissed: [],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = COMPLAINT_TRANSITIONS[from as ComplaintStatus];
  return !!allowed && allowed.includes(to as ComplaintStatus);
}

export function isComplaintStatus(value: string): value is ComplaintStatus {
  return (COMPLAINT_STATUSES as readonly string[]).includes(value);
}

export function isComplaintType(value: string): value is ComplaintType {
  return (COMPLAINT_TYPES as readonly string[]).includes(value);
}

// Katarungang Pambarangay flow: for each status, how many days the barangay
// has to take the next step (see the KP rules cited in the barangay handbook).
export const KP_DEADLINE_DAYS: DeadlineDays = {
  received: 1, // summon the respondent by the next working day
  summoned: 15, // hold mediation within 15 days of the summons
  mediation: 15, // conclude mediation (from the first meeting of the parties)
  conciliation: 15, // conclude the Pangkat conciliation
  arbitration: 15, // render the arbitration award
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
  deadlineArbitration: number;
  workingDaysOnly?: boolean;
  holidays?: string[];
}): DeadlineConfig {
  return {
    days: {
      received: settings.deadlineReceived,
      summoned: settings.deadlineSummoned,
      mediation: settings.deadlineMediation,
      conciliation: settings.deadlineConciliation,
      arbitration: settings.deadlineArbitration,
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
