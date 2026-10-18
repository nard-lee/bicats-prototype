import { Router } from "express";
import { noticeController } from "./notice.controller.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";

const router = Router();
const staffOnly = requireAuth("staff", "admin");

// Public notice board
router.get("/list", noticeController.listPublished);

// Staff management
router.get("/admin/list", staffOnly, noticeController.listAll);
router.post("/create", staffOnly, noticeController.create);
router.patch("/:id", staffOnly, noticeController.update);
router.delete("/:id", staffOnly, noticeController.remove);

export default router;
