import { z } from "zod";

export const AUDIT_ENTITY_TYPES = [
  "complaint",
  "hearing",
  "notice",
  "user",
  "auth",
] as const;

export const listAuditQuerySchema = z.object({
  entityType: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AuditListRow = {
  id: number;
  actorId: number | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  summary: string;
  meta: unknown;
  ip: string | null;
  createdAt: Date;
};

export type AuditListResult = {
  items: AuditListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
