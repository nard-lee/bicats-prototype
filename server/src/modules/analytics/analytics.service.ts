import { prisma } from "../../db.js";
import { complaintRisk } from "../complaint/complaint.schema.js";
import settingService from "../setting/setting.service.js";

const DAY = 24 * 60 * 60 * 1000;

const COMPLAINT_STATUSES = [
  "received",
  "summoned",
  "mediation",
  "conciliation",
  "settled",
  "certified",
  "dismissed",
] as const;

const OPEN_STATUSES = ["received", "summoned", "mediation", "conciliation"];
const TERMINAL_STATUSES = ["settled", "certified", "dismissed"];

export const analyticsService = {
  async getComplaintTypes() {
    return prisma.complaint.groupBy({
      by: ['complaintType'],
      _count: { complaintType: true },
      orderBy: { _count: { complaintType: 'desc' } },
    });
  },

  async getHotspots() {
    // Grouping by complainant purok to see where issues originate
    return prisma.complaint.groupBy({
      by: ['complainantPurok'],
      _count: { complainantPurok: true },
      orderBy: { _count: { complainantPurok: 'desc' } },
      take: 10, // Top 10 Puroks
    });
  },

  async getMonthlyTrends() {
    // Raw SQL is often easier for date grouping in Prisma
    const trends = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month, 
        COUNT(*)::int as count 
      FROM "Complaint" 
      GROUP BY month 
      ORDER BY month ASC
    `;
    return trends;
  },

  async getStatusDistribution() {
    return prisma.complaint.groupBy({
      by: ['status'],
      _count: { status: true },
    });
  },

  async getDigestRange(
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number,
  ) {
    const start = new Date(Date.UTC(fromYear, fromMonth - 1, 1));
    const end = new Date(Date.UTC(toYear, toMonth, 1));

    const [filedByType, filedByPurok, resolvedByStatus, sessions, snapshot, avgResolution] =
      await Promise.all([
        // New cases filed in range, by complaint type
        prisma.complaint.groupBy({
          by: ["complaintType"],
          where: { createdAt: { gte: start, lt: end } },
          _count: { complaintType: true },
          orderBy: { _count: { complaintType: "desc" } },
        }),
        // Where the month's filers came from (top puroks)
        prisma.complaint.groupBy({
          by: ["complainantPurok"],
          where: { createdAt: { gte: start, lt: end } },
          _count: { complainantPurok: true },
          orderBy: { _count: { complainantPurok: "desc" } },
          take: 10,
        }),
        // Terminal-status transitions recorded in range
        prisma.statusUpdate.groupBy({
          by: ["status"],
          where: {
            createdAt: { gte: start, lt: end },
            status: { in: TERMINAL_STATUSES },
          },
          _count: { status: true },
        }),
        // Sessions actually held / missed in range
        prisma.hearing.groupBy({
          by: ["status"],
          where: {
            scheduledAt: { gte: start, lt: end },
            status: { in: ["completed", "no_show"] },
          },
          _count: { status: true },
        }),
        // Backlog snapshot as of now
        Promise.all([
          prisma.complaint.count({ where: { status: { in: OPEN_STATUSES } } }),
          prisma.complaint.count({
            where: { status: { notIn: TERMINAL_STATUSES }, dueAt: { lt: new Date() } },
          }),
        ]),
        // Average days from filing to reaching a terminal status
        prisma.$queryRaw<{ days: number | null }[]>`
          SELECT AVG(EXTRACT(EPOCH FROM (s."createdAt" - c."createdAt")) / 86400.0)::float AS days
          FROM "StatusUpdate" s
          JOIN "Complaint" c ON c."id" = s."complaintId"
          WHERE s."status" IN ('settled', 'certified', 'dismissed')
            AND s."createdAt" >= ${start}
            AND s."createdAt" < ${end}
        `,
      ]);

    const filedTotal = filedByType.reduce((sum, row) => sum + row._count.complaintType, 0);

    const resolvedCounts: Record<string, number> = { settled: 0, certified: 0, dismissed: 0 };
    for (const row of resolvedByStatus) resolvedCounts[row.status] = row._count.status;
    const resolvedTotal = Object.values(resolvedCounts).reduce((a, b) => a + b, 0);

    const sessionCounts: Record<string, number> = { completed: 0, no_show: 0 };
    for (const row of sessions) sessionCounts[row.status] = row._count.status;

    return {
      from: `${fromYear}-${String(fromMonth).padStart(2, "0")}`,
      to: `${toYear}-${String(toMonth).padStart(2, "0")}`,
      filed: { total: filedTotal, byType: filedByType, byPurok: filedByPurok },
      resolved: {
        total: resolvedTotal,
        settled: resolvedCounts.settled,
        certified: resolvedCounts.certified,
        dismissed: resolvedCounts.dismissed,
        avgResolutionDays: avgResolution[0]?.days ?? null,
      },
      sessions: { held: sessionCounts.completed, noShow: sessionCounts.no_show },
      snapshot: { open: snapshot[0], overdue: snapshot[1] },
    };
  },

  // Lightweight totals for the complaints list. The overview carries recent
  // cases, hearings, and attention items the list never renders.
  async getStats() {
    const settings = await settingService.get();
    const windowDays = settings.riskWindowDays;
    const now = new Date();
    const soon = new Date(now.getTime() + windowDays * DAY);

    const [statusGroups, overdue, dueSoon] = await Promise.all([
      prisma.complaint.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.complaint.count({
        where: { dueAt: { lt: now }, status: { notIn: TERMINAL_STATUSES } },
      }),
      prisma.complaint.count({
        where: { dueAt: { gte: now, lte: soon }, status: { notIn: TERMINAL_STATUSES } },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    let total = 0;
    for (const group of statusGroups) {
      statusCounts[group.status] = group._count.status;
      total += group._count.status;
    }

    return {
      total,
      open: OPEN_STATUSES.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0),
      overdue,
      dueSoon,
      settled: (statusCounts.settled ?? 0) + (statusCounts.certified ?? 0),
    };
  },

  async getOverview() {
    const settings = await settingService.get();
    const windowDays = settings.riskWindowDays;
    const now = new Date();
    const soon = new Date(now.getTime() + windowDays * DAY);

    const [
      totalComplaints,
      statusGroups,
      recentComplaints,
      upcomingHearings,
      notices,
      publishedNotices,
      overdueComplaints,
      atRiskComplaints,
      attentionRaw,
    ] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.complaint.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          reference: true,
          complainantName: true,
          respondentName: true,
          complaintType: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.hearing.findMany({
        where: { status: "scheduled", scheduledAt: { gte: now } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        select: {
          id: true,
          scheduledAt: true,
          kind: true,
          status: true,
          location: true,
          complaint: {
            select: { id: true, reference: true, complainantName: true },
          },
        },
      }),
      prisma.notice.count(),
      prisma.notice.count({ where: { isPublished: true } }),
      prisma.complaint.count({
        where: {
          dueAt: { lt: now },
          status: { notIn: TERMINAL_STATUSES },
        },
      }),
      // Due soon but not yet overdue
      prisma.complaint.count({
        where: {
          dueAt: { gte: now, lte: soon },
          status: { notIn: TERMINAL_STATUSES },
        },
      }),
      // Overdue + due soon, soonest first
      prisma.complaint.findMany({
        where: {
          dueAt: { not: null, lte: soon },
          status: { notIn: TERMINAL_STATUSES },
        },
        orderBy: { dueAt: "asc" },
        take: 6,
        select: {
          id: true,
          reference: true,
          complainantName: true,
          respondentName: true,
          status: true,
          dueAt: true,
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const status of COMPLAINT_STATUSES) statusCounts[status] = 0;
    for (const group of statusGroups) statusCounts[group.status] = group._count.status;

    const open = OPEN_STATUSES.reduce(
      (sum, status) => sum + (statusCounts[status] ?? 0),
      0,
    );
    const settled = (statusCounts.settled ?? 0) + (statusCounts.certified ?? 0);

    const attention = attentionRaw.map((c) => ({
      id: c.id,
      reference: c.reference,
      complainantName: c.complainantName,
      respondentName: c.respondentName,
      status: c.status,
      dueAt: c.dueAt ? c.dueAt.toISOString() : null,
      risk: complaintRisk(c.dueAt, c.status, windowDays),
    }));

    return {
      totals: {
        complaints: totalComplaints,
        open,
        settled,
        overdue: overdueComplaints,
        atRisk: atRiskComplaints,
        notices,
        publishedNotices,
      },
      statusCounts,
      recentComplaints,
      upcomingHearings,
      attention,
    };
  },
};