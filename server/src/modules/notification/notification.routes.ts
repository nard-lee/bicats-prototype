import { Router } from "express";

import { requireAuth } from "@/middlewares/auth.middleware.js";
import { INTERNAL_ROLES } from "@/utils/roles.js";
import notificationController from "./notification.controller.js";

const router = Router();
const canRead = requireAuth(...INTERNAL_ROLES);

router.get("/", canRead, notificationController.list);
router.get("/stream", canRead, notificationController.stream);
router.post("/read-all", canRead, notificationController.markAllRead);
router.patch("/:id/read", canRead, notificationController.markRead);

export default router;
