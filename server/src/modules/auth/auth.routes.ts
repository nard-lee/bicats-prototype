import { Router } from "express";

import authController from "./auth.controller.js";
import { authLimiter } from "../../middlewares/ratelimit.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";


const router: Router = Router();

router.get('/me', requireAuth(), authController.me);
router.post('/log-in', authLimiter, authController.login);
router.post('/log-out', authLimiter, authController.logout);
router.post('/refresh', authLimiter, authController.refresh);

export default router;