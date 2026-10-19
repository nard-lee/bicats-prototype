import { Router } from "express";

import { requireAuth } from "@/middlewares/auth.middleware.js";
import { HEARING_ROLES } from "@/utils/roles.js";
import hearingController from "./hearing.controller.js";

const router = Router();
const canManage = requireAuth(...HEARING_ROLES);

router.get("/", canManage, hearingController.list);
router.get("/complaints", canManage, hearingController.complaintOptions);
router.post("/", canManage, hearingController.create);
router.patch("/:id", canManage, hearingController.update);
router.delete("/:id", canManage, hearingController.cancel);

export default router;
