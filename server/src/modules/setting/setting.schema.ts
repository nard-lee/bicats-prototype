import { z } from "zod";

export const updateSettingsSchema = z.object({
  barangayName: z.string().trim().min(1, "Barangay name is required").max(120),
  city: z.string().trim().min(1, "City is required").max(120),
  province: z.string().trim().max(120),
  address: z.string().trim().max(200),
  contactNumber: z.string().trim().max(40),
  email: z.string().trim().max(120),
  officeHours: z.string().trim().max(200),
  punongBarangay: z.string().trim().max(120),
  luponChairman: z.string().trim().max(120),
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
  updatedAt: string;
};
