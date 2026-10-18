import { Router } from "express";
import userController from "./user.controller.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";

const router: Router = Router();
const adminOnly = requireAuth("admin");

router.get("/", adminOnly, userController.list);
router.post("/create", adminOnly, userController.create);
router.patch("/:id", adminOnly, userController.update);

export default router;
