import { Router } from "express";

import { uploadEvidence } from "../../utils/upload.js";
import complaintController from "./complaint.controller.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import {
  fileComplaintLimiter,
  trackLimiter,
} from "@/middlewares/ratelimit.middleware.js";

const router = Router();

router.post("/file-complaint", fileComplaintLimiter, uploadEvidence, complaintController.create);
router.post("/track", trackLimiter, complaintController.track);
router.post('/list', requireAuth('staff', 'admin'), complaintController.list);
router.get("/:id", requireAuth('staff', 'admin'), complaintController.getById);
router.post("/:id/view", requireAuth('staff', 'admin'), complaintController.markViewed);
router.patch("/:id/status", requireAuth('staff', 'admin'), complaintController.updateStatus);
router.post("/:id/reopen", requireAuth('staff', 'admin'), complaintController.reopenCase); 

export default router;