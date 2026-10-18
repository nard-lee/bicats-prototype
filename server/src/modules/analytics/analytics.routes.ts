import { Router } from "express";
import { analyticsController } from "./analytics.controller.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";

const router = Router();
const staffOnly = requireAuth("staff", "admin");

router.get("/report", staffOnly, analyticsController.getReport);
router.get("/overview", staffOnly, analyticsController.getOverview);

export default router;
