import { z } from "zod";
import { ROLES } from "@/utils/roles.js";

export const roleSchema = z.enum(ROLES);
const fullName = z.string().trim().min(1, "Full name is required").max(100);
const position = z.string().trim().min(1, "Position is required").max(100);
const email = z.email("Invalid email address").trim().toLowerCase();

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-().]/g, ""))
  .transform((v) => {
    if (/^09\d{9}$/.test(v)) {
      return `+63${v.slice(1)}`;
    }
    return v;
  })
  .pipe(z.e164("Invalid phone number. Use 09XXXXXXXXX or international format, e.g. +639171234567"),);

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30)
  .regex(
    /^[a-z0-9_.]+$/,
    "Only letters, numbers, underscores and dots are allowed",
  );

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters"); // bcrypt limit

// Admin creates a staff account
export const createUserSchema = z.object({
  fullName,
  position,
  email,
  phone,
  username,
  password,
  role: roleSchema.default("staff"),
  isActive: z.boolean().default(true),
});

// Admin edits an account: every field optional, but at least one required
export const updateUserSchema = z
  .object({
    fullName,
    position,
    email,
    phone,
    username,
    password,
    role: roleSchema,
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

// A user edits their own profile: no role / isActive / username changes
export const updateProfileSchema = z
  .object({
    fullName,
    position,
    email,
    phone,
    password,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

// GET /users?role=staff&isActive=true
export const listUsersQuerySchema = z.object({
  role: roleSchema.optional(),
  isActive: z.stringbool().optional(), // "true"/"false" -> boolean
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Route param
export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type UserDetail = {
    id: number;
    fullName: string;
    position: string;
    email: string;
    phone: string;
    role: string;
    createdAt: Date;
};

export type UserListRow = {
    id: number;
    fullName: string;
    position: string;
    email: string;
    phone: string;
    username: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
};

export type Paginated<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;