import { prisma } from "../../db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { emitNotification } from "./notification.events.js";

export const notificationService = {
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
};

export default notificationService;
