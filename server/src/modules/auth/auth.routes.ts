import { Router } from "express";

import authController from "./auth.controller.js";
import { authLimiter } from "../../middlewares/ratelimit.middleware.js";
import { optionalAuth, requireAuth } from "../../middlewares/auth.middleware.js";


const router: Router = Router();

router.get('/me', requireAuth(), authController.me);
router.get('/bootstrap', optionalAuth(), authController.bootstrap);
router.post('/log-in', authLimiter, authController.login);
router.post('/log-out', authLimiter, authController.logout);
router.post('/refresh', authLimiter, authController.refresh);

export default router;