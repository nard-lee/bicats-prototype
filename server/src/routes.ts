import { Router } from "express";

const router: Router  = Router();

import authRouter from "@/modules/auth/auth.routes.js";
import userRouter from "@/modules/user/user.routes.js";
import complaintRouter from "@/modules/complaint/complaint.routes.js";
import noticeRouter from "@/modules/notice/notice.routes.js";
import analyticsRouter from "@/modules/analytics/analytics.routes.js";
import notificationRouter from "@/modules/notification/notification.routes.js";
import hearingRouter from "@/modules/hearing/hearing.routes.js";
import auditRouter from "@/modules/audit/audit.routes.js";
import settingRouter from "@/modules/setting/setting.routes.js";
import luponRouter from "@/modules/lupon/lupon.routes.js";

router.use("/api/auth", authRouter);
router.use("/api/users", userRouter);
router.use("/api/complaints", complaintRouter);
router.use("/api/notices", noticeRouter);
router.use("/api/analytics", analyticsRouter);
router.use("/api/notifications", notificationRouter);
router.use("/api/hearings", hearingRouter);
router.use("/api/audit", auditRouter);
router.use("/api/settings", settingRouter);
router.use("/api/lupon-members", luponRouter);

export default router;