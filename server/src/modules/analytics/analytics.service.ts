import { prisma } from "../../db.js";
import { complaintRisk } from "../complaint/complaint.schema.js";

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

  async getOverview() {
    const settings = await prisma.barangaySettings.findUnique({ where: { id: 1 } });
    const windowDays = settings?.riskWindowDays ?? 3;
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