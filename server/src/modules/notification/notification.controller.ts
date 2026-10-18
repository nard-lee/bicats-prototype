import type { Request, Response } from "express";

import notificationService from "./notification.service.js";

const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.json(await notificationService.list(userId));
  },

  async markRead(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const id = Number(req.params.id);

    if (!userId || !id || Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    await notificationService.markRead(id, userId);
    res.json({ success: true });
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await notificationService.markAllRead(userId);
    res.json({ success: true });
  },
};

export default notificationController;
