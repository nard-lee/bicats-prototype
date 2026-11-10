import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Username, email, or phone number is required")
    .transform((v) => {
      // Only a phone-shaped value loses its punctuation: usernames are allowed
      // dots and underscores, so stripping them here would make those accounts
      // impossible to sign into. Stored usernames and emails are already
      // lowercase, so one lower-casing covers both.
      const phone = v.replace(/[\s\-().+]/g, "");
      if (/^09\d{9}$/.test(phone)) {
        return `+63${phone.slice(1)}`;
      }
      if (/^639\d{9}$/.test(phone)) {
        return `+${phone}`;
      }

      return v.toLowerCase();
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