import type { Request, Response } from "express";
import { validateRequest } from "../../utils/custom.validator.js";

import complaintService from "./complaint.service.js";
import { CustomError } from "../../utils/custom.exception.js";
import { createComplaintSchema, trackComplaintSchema } from "./complaint.schema.js";

const complaintController = {

    async create(req: Request, res: Response): Promise<void> {
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        try {
            const request = validateRequest(createComplaintSchema, req.body);
            const { reference } = await complaintService.create(request, files);
            res.status(200).json({ reference, success: true });
        } catch (err: unknown) {
            if (err instanceof CustomError) {

                res.status(400).json({ error: err.message, fields: err.fields });
                return;
            }
            res.status(500).json({ error: "Internal server error" });
        }
    },

    async track(req: Request, res: Response): Promise<void> {
        try {
            const { reference, phone } = validateRequest(trackComplaintSchema, req.body);
            const result = await complaintService.track(reference, phone);

            if (!result) {
                res.status(404).json({ error: "No matching complaint found" });
                return;
            }

            res.json(result);
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                res.status(400).json({ error: err.message, fields: err.fields });
                return;
            }
            res.status(500).json({ error: "Internal server error" });
        }
    },

    async list(req: Request, res: Response): Promise<void> {
        const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
        const pageSize = Math.min(100, Math.max(1, Math.floor(Number(req.query.pageSize)) || 20));

        const q = typeof req.query.q === "string" ? req.query.q : undefined;
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const type = typeof req.query.type === "string" ? req.query.type : undefined;
        const overdue = req.query.overdue === "true" || req.query.overdue === "1";
        const dueSoon = req.query.dueSoon === "true" || req.query.dueSoon === "1";

        res.json(await complaintService.list(page, pageSize, { q, status, type, overdue, dueSoon }));
    },

    async markViewed(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            res.status(400).json({ error: "Invalid complaint ID" });
            return;
        }

        try {
            await complaintService.markViewed(id);
            res.json({ success: true });
        } catch {
            res.status(500).json({ error: "Failed to mark as viewed" });
        }
    },

    async getById(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            res.status(400).json({ error: "Invalid complaint ID" });
            return;
        }

        try {
            const complaint = await complaintService.getById(id);

            if (!complaint) {
                res.status(404).json({ error: "Complaint not found" });
                return;
            }

            res.json(complaint);
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.status(500).json({ error: "Internal server error" });
        }
    },

    async updateStatus(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);
        const { status, publicNote, internalNote, hearingAt } = req.body;

        const userId = req.user?.userId;

        try {
            await complaintService.updateStatus(id, status, publicNote, internalNote, hearingAt ? new Date(hearingAt) : undefined, userId);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Failed to update status" });
        }
    },

    async reopenCase(req: Request, res: Response) {
        const id = Number(req.params.id);
        const { reason } = req.body;
        const userId = req.user?.userId;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid Complaint ID" });
        }

        if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
            return res.status(400).json({ error: "A reason for reopening is required" });
        }

        try {
            await complaintService.reopenCase(id, reason, userId);
            res.json({ success: true, message: "Case reopened successfully" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to reopen case" });
        }
    }
}

export default complaintController;