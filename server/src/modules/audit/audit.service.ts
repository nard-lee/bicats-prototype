import type { Request } from "express";

import { prisma } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type {
  AuditListResult,
  AuditListRow,
  ExportAuditQuery,
  ListAuditQuery,
} from "./audit.schema.js";

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

function buildWhere(query: { entityType?: string | undefined; q?: string | undefined }) {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.entityType && query.entityType !== "all") {
    where.entityType = query.entityType;
  }
  if (query.q) {
    where.OR = [
      { summary: { contains: query.q, mode: "insensitive" } },
      { actorName: { contains: query.q, mode: "insensitive" } },
    ];
  }
  return where;
}

type AuditRecord = Omit<AuditListRow, "target">;

const HEARING_KIND_LABEL: Record<string, string> = {
  mediation: "Mediation",
  conciliation: "Conciliation",
  hearing: "Arbitration",
};

// Resolve internal IDs to the identifiers staff actually recognize. Deleted
// records are called out instead of leaving a bare numeric ID.
async function attachTargets(rows: AuditRecord[]): Promise<AuditListRow[]> {
  const idsFor = (entityType: string) => [
    ...new Set(
      rows
        .filter((row) => row.entityType === entityType && row.entityId !== null)
        .map((row) => row.entityId as number),
    ),
  ];

  const complaintIds = idsFor("complaint");
  const hearingIds = idsFor("hearing");
  const userIds = idsFor("user");
  const noticeIds = idsFor("notice");

  const [complaints, hearings, users, notices] = await Promise.all([
    complaintIds.length
      ? prisma.complaint.findMany({
          where: { id: { in: complaintIds } },
          select: { id: true, reference: true },
        })
      : Promise.resolve([] as { id: number; reference: string }[]),
    hearingIds.length
      ? prisma.hearing.findMany({
          where: { id: { in: hearingIds } },
          select: {
            id: true,
            kind: true,
            complaint: { select: { reference: true } },
          },
        })
      : Promise.resolve(
          [] as { id: number; kind: string; complaint: { reference: string } }[],
        ),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([] as { id: number; fullName: string }[]),
    noticeIds.length
      ? prisma.notice.findMany({
          where: { id: { in: noticeIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([] as { id: number; title: string }[]),
  ]);

  const complaintMap = new Map(complaints.map((row) => [row.id, row.reference]));
  const hearingMap = new Map(hearings.map((row) => [row.id, row]));
  const userMap = new Map(users.map((row) => [row.id, row.fullName]));
  const noticeMap = new Map(notices.map((row) => [row.id, row.title]));

  const targetFor = (row: AuditRecord): string => {
    if (row.entityType === "setting") return "Barangay settings";
    if (row.entityType === "auth") return "Sign-in";
    if (row.entityId === null) return "—";

    const id = row.entityId;

    if (row.entityType === "complaint") {
      return complaintMap.get(id) ?? `Complaint #${id} (record deleted)`;
    }
    if (row.entityType === "hearing") {
      const hearing = hearingMap.get(id);
      if (!hearing) return `Mediation #${id} (record deleted)`;
      return `${hearing.complaint.reference} (${HEARING_KIND_LABEL[hearing.kind] ?? "Session"})`;
    }
    if (row.entityType === "user") {
      return userMap.get(id) ?? `Account #${id} (record deleted)`;
    }
    if (row.entityType === "notice") {
      return noticeMap.get(id) ?? `Notice #${id} (record deleted)`;
    }

    return `${row.entityType} #${id}`;
  };

  // Older entries stored database IDs in their summaries. Swap those for the
  // same references shown in the target column so every row reads clearly.
  const clarifySummary = (row: AuditRecord): string => {
    if (row.entityId === null) return row.summary;

    const hearing =
      row.entityType === "hearing" ? hearingMap.get(row.entityId) : undefined;
    const caseReference =
      row.entityType === "complaint"
        ? complaintMap.get(row.entityId)
        : hearing?.complaint.reference;

    let summary = row.summary.replace(/case #(\d+)/gi, (_match, id: string) =>
      caseReference ?? `Complaint #${id} (record deleted)`,
    );

    if (row.entityType === "hearing") {
      summary = summary.replace(/mediation session #(\d+)/gi, () =>
        `mediation for ${
          caseReference ?? `Mediation #${row.entityId} (record deleted)`
        }`,
      );
    }

    return summary;
  };

  return rows.map((row) => ({
    ...row,
    target: targetFor(row),
    summary: clarifySummary(row),
  }));
}

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
    const where = buildWhere(query);

    const page = query.page;
    const pageSize = query.limit;

    const [rows, total] = await Promise.all([
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
      items: await attachTargets(rows),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  // All rows matching the filters, for CSV export (capped to keep it sane).
  async exportAll(query: ExportAuditQuery): Promise<AuditListRow[]> {
    const rows = await prisma.auditLog.findMany({
      where: buildWhere(query),
      orderBy: { id: "desc" },
      take: 5000,
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
    });

    return attachTargets(rows);
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
