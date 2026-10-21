import type { Request, Response } from "express";

import { CustomError } from "../../utils/custom.exception.js";
import notificationService from "./notification.service.js";
import { notificationEvents } from "./notification.events.js";

const HEARTBEAT_MS = 25_000;

const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("Unauthorized", undefined, 401);
    }

    res.json(await notificationService.list(userId));
  },

  async markRead(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    const id = Number(req.params.id);

    if (!userId || !id || Number.isNaN(id)) {
      throw new CustomError("Invalid request", undefined, 400);
    }

    await notificationService.markRead(id, userId);
    res.json({ success: true });
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("Unauthorized", undefined, 401);
    }

    await notificationService.markAllRead(userId);
    res.json({ success: true });
  },

  // Server-Sent Events stream: pushes a tick whenever this user gets a new
  // notification so the bell can refresh without polling.
  async stream(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("Unauthorized", undefined, 401);
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    // `no-transform` keeps the compression middleware from buffering the stream.
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    // Comment frames are ignored by EventSource but reassure us the pipe is open.
    res.write(": connected\n\n");

    const channel = `user:${userId}`;
    const onEvent = () => res.write("data: refresh\n\n");

    notificationEvents.on(channel, onEvent);

    const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

    req.on("close", () => {
      clearInterval(heartbeat);
      notificationEvents.off(channel, onEvent);
    });
  },
};

export default notificationController;
