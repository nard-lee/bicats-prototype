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

export const updateSettingsSchema = z.object({
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

  hotline: phoneSchema,
  tanodNumber: phoneSchema,

  deadlineReceived: daysSchema,
  deadlineSummoned: daysSchema,
  deadlineConciliation: daysSchema,
  riskWindowDays: daysSchema,

  notifyStatusSms: z.boolean(),
  notifyStatusEmail: z.boolean(),
  notifyMediationSms: z.boolean(),
  notifyMediationEmail: z.boolean(),
  notifyCancelledSms: z.boolean(),
  notifyCancelledEmail: z.boolean(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export type BarangaySettingsDTO = {
  id: number;
  barangayName: string;
  city: string;
  province: string;
  address: string;
  contactNumber: string;
  email: string;
  officeHours: string;
  punongBarangay: string;
  luponChairman: string;
  logoUrl: string;
  punongSignatureUrl: string;
  luponSignatureUrl: string;
  punongTitle: string;
  luponTitle: string;
  hotline: string;
  tanodNumber: string;
  deadlineReceived: number;
  deadlineSummoned: number;
  deadlineConciliation: number;
  riskWindowDays: number;
  notifyStatusSms: boolean;
  notifyStatusEmail: boolean;
  notifyMediationSms: boolean;
  notifyMediationEmail: boolean;
  notifyCancelledSms: boolean;
  notifyCancelledEmail: boolean;
  updatedAt: string;
};
