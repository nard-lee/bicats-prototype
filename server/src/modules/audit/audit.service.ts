import type { Request } from "express";

import { prisma } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { AuditListResult, ListAuditQuery } from "./audit.schema.js";

type RecordInput = {
  actorId?: number | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  summary: string;
  meta?: Prisma.InputJsonValue;
  ip?: string | null;
};

const auditService = {
  // Never let a failed write break the action it describes.
  async record(input: RecordInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId ?? null,
          actorName: input.actorName ?? null,
          actorRole: input.actorRole ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          summary: input.summary,
          ...(input.meta !== undefined ? { meta: input.meta } : {}),
          ip: input.ip ?? null,
        },
      });
    } catch (err) {
      console.error("==> audit: failed to record entry", err);
    }
  },

  async list(query: ListAuditQuery): Promise<AuditListResult> {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.q) {
      where.OR = [
        { summary: { contains: query.q, mode: "insensitive" } },
        { actorName: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const page = query.page;
    const pageSize = query.limit;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          actorId: true,
          actorName: true,
          actorRole: true,
          action: true,
          entityType: true,
          entityId: true,
          summary: true,
          meta: true,
          ip: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
};

// Convenience wrapper for authenticated routes (req.user is populated).
export function auditFromRequest(
  req: Request,
  entry: {
    action: string;
    entityType: string;
    entityId?: number | null;
    summary: string;
    meta?: Prisma.InputJsonValue;
  },
): Promise<void> {
  return auditService.record({
    actorId: req.user?.userId ?? null,
    actorName: req.user?.fullName ?? null,
    actorRole: req.user?.role ?? null,
    ip: req.ip ?? null,
    ...entry,
  });
}

export default auditService;
