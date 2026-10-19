import type { Key } from "@/lib/I18n";

// Mirror of server/src/utils/roles.ts — keep the two in sync.
export const ROLES = ["admin", "staff", "secretary", "lupon"] as const;
export type Role = (typeof ROLES)[number];

export const INTERNAL_ROLES: Role[] = ["admin", "staff", "secretary", "lupon"];
export const HEARING_ROLES: Role[] = ["admin", "staff", "lupon"];
export const NOTICE_ROLES: Role[] = ["admin", "staff", "secretary"];
export const ADMIN_ROLES: Role[] = ["admin"];

export const ROLE_LABEL: Record<Role, Key> = {
  admin: "roleAdmin",
  staff: "roleStaff",
  secretary: "roleSecretary",
  lupon: "roleLupon",
};

export function isRole(value: string | undefined | null): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value);
}
