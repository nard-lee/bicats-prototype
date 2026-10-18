import type { Request, Response } from "express"
import { validateRequest } from "../../utils/custom.validator.js"
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from "./user.schema.js"
import userService from "./user.service.js";
import { CustomError } from "../../utils/custom.exception.js";

const userController = {

    async create(req: Request, res: Response): Promise<void> {
        try {
            const request = validateRequest(createUserSchema, req.body);
            await userService.create(request);
            res.status(200).json({ success: true });
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                res.status(400).json({ error: err.message, fields: err.fields });
                return;
            }
            res.status(500).json({ error: "Internal server error" });
        }
    },

    async list(req: Request, res: Response): Promise<void> {
        try {
            const query = validateRequest(listUsersQuerySchema, req.query);
            res.json(await userService.list(query));
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                res.status(400).json({ error: err.message, fields: err.fields });
                return;
            }
            res.status(500).json({ error: "Internal server error" });
        }
    },

    async update(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            res.status(400).json({ error: "Invalid account ID" });
            return;
        }

        try {
            const body = validateRequest(updateUserSchema, req.body);
            res.json(await userService.update(id, body));
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                res.status(400).json({ error: err.message, fields: err.fields });
                return;
            }
            res.status(500).json({ error: "Internal server error" });
        }
    },

}

export default userController;
