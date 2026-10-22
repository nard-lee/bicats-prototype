import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .max(40)
  .refine(
    (value) => value === "" || /^[+\d][\d\s()-]{4,29}$/.test(value),
    "Enter a valid contact number",
  );

const emailSchema = z
  .string()
  .trim()
  .max(120)
  .refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Enter a valid email address",
  );

const assetSchema = z.string().trim().max(500);
const daysSchema = z.coerce.number().int().min(1).max(365);
const hourSchema = z.coerce.number().int().min(0).max(24);

export const updateSettingsSchema = z
  .object({
    barangayName: z.string().trim().min(1, "Barangay name is required").max(120),
    city: z.string().trim().min(1, "City is required").max(120),
    province: z.string().trim().max(120),
    address: z.string().trim().max(200),
    contactNumber: phoneSchema,
    email: emailSchema,
    officeHours: z.string().trim().max(200),
    punongBarangay: z.string().trim().max(120),
    luponChairman: z.string().trim().max(120),

    logoUrl: assetSchema,
    punongSignatureUrl: assetSchema,
    luponSignatureUrl: assetSchema,

    punongTitle: z.string().trim().max(120),
    luponTitle: z.string().trim().max(120),

    puroks: z
      .array(z.string().trim().min(1).max(60))
      .max(30)
      .transform((names) => [...new Set(names)])
      .refine((names) => names.length >= 1, "Add at least one purok"),
    documentOfficeLine: z
      .string()
      .trim()
      .min(1, "The office line is required")
      .max(120),

    hotline: phoneSchema,
    tanodNumber: phoneSchema,

    defaultHearingLocation: z.string().trim().max(200),
    hearingDurationMinutes: z.coerce.number().int().min(15).max(480),
    officeStartHour: hourSchema.max(23),
    officeEndHour: hourSchema.min(1),
    enforceOfficeHours: z.boolean(),
    hearingGraceHours: z.coerce.number().int().min(0).max(24),

    deadlineReceived: daysSchema,
    deadlineSummoned: daysSchema,
    deadlineMediation: daysSchema,
    deadlineConciliation: daysSchema,
    riskWindowDays: daysSchema,
    workingDaysOnly: z.boolean(),
    holidays: z
      .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date"))
      .max(60)
      .transform((dates) => [...new Set(dates)].sort()),

    notifyStatusSms: z.boolean(),
    notifyStatusEmail: z.boolean(),
    notifyMediationSms: z.boolean(),
    notifyMediationEmail: z.boolean(),
    notifyCancelledSms: z.boolean(),
    notifyCancelledEmail: z.boolean(),
    reminderLeadHours: z.coerce.number().int().min(1).max(168),
  })
  .refine((input) => input.officeStartHour < input.officeEndHour, {
    message: "Closing hour must be later than the opening hour",
    path: ["officeEndHour"],
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
