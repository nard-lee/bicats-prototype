// Single source of truth for staff roles and what each role may do.
// Keep in sync with the client: client/src/lib/roles.ts
export const ROLES = ["admin", "staff", "secretary", "lupon"] as const;
export type Role = (typeof ROLES)[number];

// Everyone who can sign in to the staff panel.
export const INTERNAL_ROLES: Role[] = ["admin", "staff", "secretary", "lupon"];

// See the complaint register.
export const CASE_VIEW_ROLES: Role[] = ["admin", "staff", "secretary", "lupon"];
// Change status / priority, reopen, bulk-update.
export const CASE_WRITE_ROLES: Role[] = ["admin", "staff", "lupon"];

// Schedule and manage hearings.
export const HEARING_ROLES: Role[] = ["admin", "staff", "lupon"];

// Publish and edit the notice board.
export const NOTICE_ROLES: Role[] = ["admin", "staff", "secretary"];

// Account management and the audit trail.
export const ADMIN_ROLES: Role[] = ["admin"];
