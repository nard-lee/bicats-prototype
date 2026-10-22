import { z } from "zod";

export const SERVICE_RESULTS = ["received", "refused", "not_found"] as const;

export type ServiceResult = (typeof SERVICE_RESULTS)[number];

export const createServiceRecordSchema = z.object({
  servedAt: z.coerce
    .date({ error: "Enter when the summons was served" })
    .refine((value) => value <= new Date(), "The service date can't be in the future"),
  serverName: z
    .string({ error: "Enter who served the summons" })
    .trim()
    .min(2, "Enter who served the summons")
    .max(120),
  result: z.enum(SERVICE_RESULTS, { error: "Select the result of service" }),
  notes: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional()
    .transform((value) => value || null),
});

export type CreateServiceRecordInput = z.output<typeof createServiceRecordSchema>;
