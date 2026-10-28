import { z } from "zod";

const fullName = z
  .string()
  .trim()
  .min(2, "Enter the member's full name")
  .max(120);

const contact = z.string().trim().max(40).nullable();

export const createLuponMemberSchema = z.object({
  fullName,
  contact: contact.optional().transform((value) => value || null),
});

export const updateLuponMemberSchema = z.object({
  fullName: fullName.optional(),
  // Absent means "leave it alone"; a blank string clears it.
  contact: contact.optional().transform((value) =>
    value === undefined ? undefined : value || null,
  ),
  isActive: z.boolean().optional(),
});

export type CreateLuponMemberInput = z.output<typeof createLuponMemberSchema>;
export type UpdateLuponMemberInput = z.output<typeof updateLuponMemberSchema>;
