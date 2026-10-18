import { Router } from "express";

import { requireAuth } from "@/middlewares/auth.middleware.js";
import notificationController from "./notification.controller.js";

const router = Router();

router.get("/", requireAuth("staff", "admin"), notificationController.list);
router.post("/read-all", requireAuth("staff", "admin"), notificationController.markAllRead);
router.patch("/:id/read", requireAuth("staff", "admin"), notificationController.markRead);

export default router;
