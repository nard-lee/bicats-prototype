import { z } from "zod";

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
  .pipe(
    z.e164(
      "Invalid phone number. Use 09XXXXXXXXX or international format, e.g. +639171234567",
    ),
  );

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email, username, or phone number is required")
    .transform((v) => {
      if (v.includes("@")) return v.toLowerCase();

      const normalized = v.replace(/[\s\-().]/g, "");

      if (/^09\d{9}$/.test(normalized)) {
        return `+63${normalized.slice(1)}`;
      }

      return normalized;
    }),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional().default(false),
});

export type AuthToken = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResult = AuthToken & {
  user: { id: number; fullName: string; role: string };
};

export type RefreshResult = AuthToken & {
  remember: boolean;
};

export type LoginInput = z.infer<typeof loginSchema>;