import { Router } from "express";

import { requireAuth } from "@/middlewares/auth.middleware.js";
import { ADMIN_ROLES } from "@/utils/roles.js";
import settingController from "./setting.controller.js";

const router = Router();

// Public: the barangay profile is non-sensitive and used by the letterhead.
router.get("/", settingController.get);
router.patch("/", requireAuth(...ADMIN_ROLES), settingController.update);

export default router;
