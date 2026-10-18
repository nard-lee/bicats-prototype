import { prisma } from "../../db.js";

export const notificationService = {
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
};

export default notificationService;
