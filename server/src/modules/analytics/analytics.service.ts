import { prisma } from "../../db.js";

const COMPLAINT_STATUSES = [
  "received",
  "under_mediation",
  "settled",
  "endorsed",
  "dismissed",
] as const;

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
    ]);

    const statusCounts: Record<string, number> = {};
    for (const status of COMPLAINT_STATUSES) statusCounts[status] = 0;
    for (const group of statusGroups) statusCounts[group.status] = group._count.status;

    return {
      totals: {
        complaints: totalComplaints,
        open: (statusCounts.received ?? 0) + (statusCounts.under_mediation ?? 0),
        settled: statusCounts.settled ?? 0,
        notices,
        publishedNotices,
      },
      statusCounts,
      recentComplaints,
      upcomingHearings,
    };
  },
};