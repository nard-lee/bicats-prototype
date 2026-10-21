import { prisma } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { INTERNAL_ROLES } from "../../utils/roles.js";
import { emitNotification } from "./notification.events.js";

const DAY = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 90;
const MAX_NOTIFICATIONS_PER_USER = 100;

export const notificationService = {
  // Keep the inbox bounded: drop notifications older than the retention
  // window and anything beyond the newest 100 per user.
  async prune(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY);
    await prisma.$executeRaw`
      DELETE FROM "Notification"
      WHERE "createdAt" < ${cutoff}
         OR "id" IN (
           SELECT "id" FROM (
             SELECT
               "id",
               ROW_NUMBER() OVER (
                 PARTITION BY "userId"
                 ORDER BY "createdAt" DESC, "id" DESC
               ) AS rn
             FROM "Notification"
           ) ranked
           WHERE ranked.rn > ${MAX_NOTIFICATIONS_PER_USER}
         )
    `;
  },

  // Remove alerts matched by a dedupe prefix (e.g. all overdue alerts for a
  // hearing) and refresh the affected users' bells.
  async clearByDedupePrefix(prefix: string): Promise<number> {
    const affected = await prisma.notification.findMany({
      where: { dedupeKey: { startsWith: prefix } },
      select: { userId: true },
      distinct: ["userId"],
    });

    if (affected.length === 0) return 0;

    const result = await prisma.notification.deleteMany({
      where: { dedupeKey: { startsWith: prefix } },
    });

    for (const row of affected) emitNotification(row.userId);

    return result.count;
  },

  // Insert a batch of notifications and nudge every affected user's live
  // stream so their bell refreshes immediately.
  async createForUsers(rows: Prisma.NotificationCreateManyInput[]): Promise<number> {
    if (rows.length === 0) return 0;

    const result = await prisma.notification.createMany({
      data: rows,
      skipDuplicates: true,
    });

    for (const userId of new Set(rows.map((row) => row.userId))) {
      emitNotification(userId);
    }

    await this.prune();

    return result.count;
  },

  async list(userId: number, take = 20) {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        // Unread first, then newest.
        orderBy: [
          { readAt: { sort: "asc", nulls: "first" } },
          { createdAt: "desc" },
        ],
        take,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          complaintId: true,
          reference: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { items, unread };
  },

  async markRead(id: number, userId: number) {
    await prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  async markAllRead(userId: number) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  // Opening a case clears that user's notifications for it.
  async markReadForComplaint(userId: number, complaintId: number) {
    await prisma.notification.updateMany({
      where: { userId, complaintId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  // Tell every active staff member that a new complaint was filed.
  async notifyNewComplaint(input: {
    id: number;
    reference: string;
    complainantName: string;
    respondentName: string;
  }): Promise<number> {
    const staff = await prisma.user.findMany({
      where: { isActive: true, role: { in: [...INTERNAL_ROLES] } },
      select: { id: true },
    });

    if (staff.length === 0) return 0;

    const rows = staff.map((member) => ({
      userId: member.id,
      type: "new_complaint",
      title: `New complaint ${input.reference}`,
      body: `${input.complainantName} filed a complaint just now.`,
      complaintId: input.id,
      reference: input.reference, 
      dedupeKey: `new_complaint:${input.id}:${member.id}`,
    }));

    return this.createForUsers(rows);
  },
};

export default notificationService;
