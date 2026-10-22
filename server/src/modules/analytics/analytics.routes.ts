import { Router } from "express";
import { analyticsController } from "./analytics.controller.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { INTERNAL_ROLES } from "@/utils/roles.js";

const router = Router();
const staffOnly = requireAuth(...INTERNAL_ROLES);

router.get("/report", staffOnly, analyticsController.getReport);
router.get("/digest", staffOnly, analyticsController.getDigest);
router.get("/stats", staffOnly, analyticsController.getStats);
router.get("/overview", staffOnly, analyticsController.getOverview);

export default router;
