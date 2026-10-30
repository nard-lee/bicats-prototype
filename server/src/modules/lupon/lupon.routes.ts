import { Router } from "express";

import { requireAuth } from "@/middlewares/auth.middleware.js";
import { ADMIN_ROLES, INTERNAL_ROLES } from "@/utils/roles.js";
import luponController from "./lupon.controller.js";

const router = Router();

// Public: current members' names only, for the site's roster.
router.get("/public", luponController.listPublic);

// The roster is public within the staff panel; only an admin changes it.
router.get("/", requireAuth(...INTERNAL_ROLES), luponController.list);
router.post("/", requireAuth(...ADMIN_ROLES), luponController.create);
router.patch("/:id", requireAuth(...ADMIN_ROLES), luponController.update);
router.delete("/:id", requireAuth(...ADMIN_ROLES), luponController.remove);

export default router;
