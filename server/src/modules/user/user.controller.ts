import type { Request, Response } from "express"
import { validateRequest } from "../../utils/custom.validator.js"
import { createUserSchema, listUsersQuerySchema, updateProfileSchema, updateUserSchema } from "./user.schema.js"
import userService from "./user.service.js";
import { CustomError } from "../../utils/custom.exception.js";
import { auditFromRequest } from "../audit/audit.service.js";

const userController = {

    async create(req: Request, res: Response): Promise<void> {
        const request = validateRequest(createUserSchema, req.body);
        const created = await userService.create(request);
        res.status(200).json({ success: true });

        await auditFromRequest(req, {
            action: "user.create",
            entityType: "user",
            entityId: created.id,
            summary: `Created ${request.role} account "${request.fullName}"`,
            meta: { role: request.role },
        });
    },

    async list(req: Request, res: Response): Promise<void> {
        const query = validateRequest(listUsersQuerySchema, req.query);
        res.json(await userService.list(query));
    },

    async updateMe(req: Request, res: Response): Promise<void> {
        if (!req.user) {
            throw new CustomError("Not authenticated", undefined, 401);
        }

        const body = validateRequest(updateProfileSchema, req.body);
        const updated = await userService.update(req.user.userId, body);
        res.json(updated);

        await auditFromRequest(req, {
            action: "user.update",
            entityType: "user",
            entityId: req.user.userId,
            summary: `Updated own profile (${updated.fullName})`,
            meta: { fields: Object.keys(body) },
        });
    },

    async update(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            throw new CustomError("Invalid account ID", undefined, 400);
        }

        const body = validateRequest(updateUserSchema, req.body);
        const updated = await userService.update(id, body);
        res.json(updated);

        await auditFromRequest(req, {
            action: "user.update",
            entityType: "user",
            entityId: id,
            summary: `Updated account "${updated.fullName}"`,
            meta: { fields: Object.keys(body) },
        });
    },

}

export default userController;
