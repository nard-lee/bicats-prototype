import { prisma } from "../../db.js";

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
    const now = new Date();

    const [
      totalComplaints,
      statusGroups,
      recentComplaints,
      upcomingHearings,
      notices,
      publishedNotices,
      overdueComplaints,
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
      prisma.statusUpdate.findMany({
        where: { hearingAt: { gte: now } },
        orderBy: { hearingAt: "asc" },
        take: 5,
        select: {
          id: true,
          hearingAt: true,
          status: true,
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
    ]);

    const statusCounts: Record<string, number> = {};
    for (const status of COMPLAINT_STATUSES) statusCounts[status] = 0;
    for (const group of statusGroups) statusCounts[group.status] = group._count.status;

    const open = OPEN_STATUSES.reduce(
      (sum, status) => sum + (statusCounts[status] ?? 0),
      0,
    );
    const settled = (statusCounts.settled ?? 0) + (statusCounts.certified ?? 0);

    return {
      totals: {
        complaints: totalComplaints,
        open,
        settled,
        overdue: overdueComplaints,
        notices,
        publishedNotices,
      },
      statusCounts,
      recentComplaints,
      upcomingHearings,
    };
  },
};