import { Router } from "express";

import { requireAuth } from "@/middlewares/auth.middleware.js";
import { ADMIN_ROLES } from "@/utils/roles.js";
import auditController from "./audit.controller.js";

const router = Router();

router.get("/", requireAuth(...ADMIN_ROLES), auditController.list);
router.get("/export", requireAuth(...ADMIN_ROLES), auditController.export);

export default router;
