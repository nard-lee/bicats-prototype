import { Router } from "express";

import { requireAuth } from "@/middlewares/auth.middleware.js";
import { ADMIN_ROLES } from "@/utils/roles.js";
import auditController from "./audit.controller.js";

const router = Router();

router.get("/", requireAuth(...ADMIN_ROLES), auditController.list);

export default router;
