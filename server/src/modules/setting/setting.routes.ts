import { Router } from "express";

import { requireAuth } from "@/middlewares/auth.middleware.js";
import { uploadImage } from "@/utils/upload.js";
import { ADMIN_ROLES, INTERNAL_ROLES } from "@/utils/roles.js";
import settingController from "./setting.controller.js";

const router = Router();

// Public: the barangay profile is non-sensitive and used by the letterhead.
router.get("/", settingController.get);
router.get(
  "/channels",
  requireAuth(...INTERNAL_ROLES),
  settingController.channels,
);
router.patch("/", requireAuth(...ADMIN_ROLES), settingController.update);
router.post(
  "/upload",
  requireAuth(...ADMIN_ROLES),
  uploadImage,
  settingController.upload,
);

export default router;
