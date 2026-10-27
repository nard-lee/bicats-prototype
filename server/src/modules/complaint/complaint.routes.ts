import { Router } from "express";

import { uploadEvidence } from "../../utils/upload.js";
import complaintController from "./complaint.controller.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { CASE_VIEW_ROLES, CASE_WRITE_ROLES } from "@/utils/roles.js";
import {
  fileComplaintLimiter,
  trackLimiter,
} from "@/middlewares/ratelimit.middleware.js";

const router = Router();

router.post("/file-complaint", fileComplaintLimiter, uploadEvidence, complaintController.create);
router.post("/track", trackLimiter, complaintController.track);
router.post('/list', requireAuth(...CASE_VIEW_ROLES), complaintController.list);
router.post("/bulk-status", requireAuth(...CASE_WRITE_ROLES), complaintController.bulkStatus);
router.get("/:id", requireAuth(...CASE_VIEW_ROLES), complaintController.getById);
router.post("/:id/view", requireAuth(...CASE_VIEW_ROLES), complaintController.markViewed);
router.patch("/:id/status", requireAuth(...CASE_WRITE_ROLES), complaintController.updateStatus);
router.patch("/:id/eligibility", requireAuth(...CASE_WRITE_ROLES), complaintController.reviewEligibility);
router.patch("/:id/pangkat", requireAuth(...CASE_WRITE_ROLES), complaintController.updatePangkat);
router.post("/:id/service-records", requireAuth(...CASE_WRITE_ROLES), complaintController.addServiceRecord);
router.post("/:id/reopen", requireAuth(...CASE_WRITE_ROLES), complaintController.reopenCase); 

export default router;