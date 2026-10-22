import type { Request, Response } from "express";
import { validateRequest } from "../../utils/custom.validator.js";

import complaintService from "./complaint.service.js";
import notificationService from "../notification/notification.service.js";
import complainantNotifier from "../notify/complainant.notifier.js";
import { auditFromRequest } from "../audit/audit.service.js";
import { CustomError } from "../../utils/custom.exception.js";
import { COMPLAINT_STATUSES, createComplaintSchema, trackComplaintSchema, updatePrioritySchema } from "./complaint.schema.js";
import { updateEligibilitySchema } from "./complaint.eligibility.js";
import { createServiceRecordSchema } from "./complaint.service-record.js";
import { removeUploadedFiles } from "../../utils/upload.js";

const complaintController = {

    async create(req: Request, res: Response): Promise<void> {
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];

        try {
            const request = validateRequest(createComplaintSchema, req.body);
            const { id, reference } = await complaintService.create(request, files);
            res.status(200).json({ reference, success: true });

            // Alert staff to the new filing; never let this break the response.
            try {
                await notificationService.notifyNewComplaint({
                    id,
                    reference,
                    complainantName: request.complainantName,
                    respondentName: request.respondentName,
                });
            } catch (err) {
                console.error("==> notifications: new complaint alert failed", err);
            }
        } catch (err) {
            // Rejecting the request leaves the uploads orphaned on disk.
            await removeUploadedFiles(files);
            throw err;
        }
    },

    async track(req: Request, res: Response): Promise<void> {
        const { reference, phone } = validateRequest(trackComplaintSchema, req.body);
        const result = await complaintService.track(reference, phone);

        if (!result) {
            throw new CustomError("No matching complaint found", undefined, 404);
        }

        res.json(result);
    },

    async list(req: Request, res: Response): Promise<void> {
        const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
        const pageSize = Math.min(100, Math.max(1, Math.floor(Number(req.query.pageSize)) || 20));

        const q = typeof req.query.q === "string" ? req.query.q : undefined;
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const type = typeof req.query.type === "string" ? req.query.type : undefined;
        const priority = typeof req.query.priority === "string" ? req.query.priority : undefined;
        const open = req.query.open === "true" || req.query.open === "1";
        const overdue = req.query.overdue === "true" || req.query.overdue === "1";
        const dueSoon = req.query.dueSoon === "true" || req.query.dueSoon === "1";

        res.json(await complaintService.list(page, pageSize, { q, status, type, priority, open, overdue, dueSoon }));
    },

    async markViewed(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            throw new CustomError("Invalid complaint ID", undefined, 400);
        }

        await complaintService.markViewed(id);

        // Opening the case also clears its notifications for this user.
        const userId = req.user?.userId;
        if (userId) {
            await notificationService.markReadForComplaint(userId, id);
        }

        res.json({ success: true });
    },

    async getById(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            throw new CustomError("Invalid complaint ID", undefined, 400);
        }

        const complaint = await complaintService.getById(id);

        if (!complaint) {
            throw new CustomError("Complaint not found", undefined, 404);
        }

        res.json(complaint);
    },

    async updateStatus(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);
        const { status, publicNote, internalNote, hearingAt } = req.body;

        if (!id || isNaN(id)) {
            throw new CustomError("Invalid complaint ID", undefined, 400);
        }

        if (!(COMPLAINT_STATUSES as readonly string[]).includes(status)) {
            throw new CustomError("Invalid complaint status", undefined, 400);
        }

        const hearingDate = hearingAt ? new Date(hearingAt) : undefined;
        if (hearingDate && isNaN(hearingDate.getTime())) {
            throw new CustomError("Invalid mediation date", undefined, 400);
        }

        const userId = req.user?.userId;

        const updated = await complaintService.updateStatus(id, status, publicNote, internalNote, hearingDate, userId);
        res.json({ success: true });

        await auditFromRequest(req, {
            action: "complaint.status.update",
            entityType: "complaint",
            entityId: id,
            summary: `${updated.reference}: status changed from "${updated.previousStatus}" to "${status}"`,
            meta: { status, previousStatus: updated.previousStatus, hasPublicNote: !!publicNote, hasInternalNote: !!internalNote },
        });

        // Text/email the complainant about the new step (and any mediation date).
        void complainantNotifier.statusUpdate(id, {
            status,
            publicNote: publicNote ?? null,
            hearingAt: hearingDate ?? null,
        });
    },

    async bulkStatus(req: Request, res: Response): Promise<void> {
        const raw = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]) : [];
        const ids = raw
            .map((value) => Number(value))
            .filter((id) => Number.isInteger(id) && id > 0);

        const status = typeof req.body?.status === "string" ? req.body.status : "";

        if (ids.length === 0 || !(COMPLAINT_STATUSES as readonly string[]).includes(status)) {
            throw new CustomError("Select at least one complaint and a valid status", undefined, 400);
        }

        const updated = await complaintService.bulkUpdateStatus(ids, status, req.user?.userId);
        res.json({ success: true, updated });

        await auditFromRequest(req, {
            action: "complaint.bulk_status",
            entityType: "complaint",
            summary: `Set ${updated} case(s) to "${status}"`,
            meta: { ids, status, updated },
        });
    },

    async updatePriority(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            throw new CustomError("Invalid complaint ID", undefined, 400);
        }

        const { priority } = validateRequest(updatePrioritySchema, req.body);
        const result = await complaintService.setPriority(id, priority);

        if (!result || result.count === 0) {
            throw new CustomError("Complaint not found", undefined, 404);
        }

        res.json({ success: true });

        await auditFromRequest(req, {
            action: "complaint.priority.update",
            entityType: "complaint",
            entityId: id,
            summary: `${result.reference}: priority changed from "${result.previousPriority}" to "${priority}"`,
            meta: { priority, previousPriority: result.previousPriority },
        });
    },

    async reviewEligibility(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            throw new CustomError("Invalid complaint ID", undefined, 400);
        }

        const input = validateRequest(updateEligibilitySchema, req.body);
        const updated = await complaintService.reviewEligibility(
            id,
            input,
            req.user?.userId,
        );

        res.json({ success: true });

        await auditFromRequest(req, {
            action: "complaint.eligibility.update",
            entityType: "complaint",
            entityId: id,
            summary: `${updated.reference}: eligibility changed from "${updated.previousStatus}" to "${input.eligibilityStatus}"${updated.dismissed ? " (case auto-dismissed)" : ""}`,
            meta: {
                eligibilityStatus: input.eligibilityStatus,
                previousStatus: updated.previousStatus,
                previousComplaintStatus: updated.previousComplaintStatus,
                dismissed: updated.dismissed,
                hasNotes: !!input.eligibilityNotes,
                hasReason: !!input.eligibilityReason,
            },
        });

        if (updated.dismissed && updated.dismissalNote) {
            void complainantNotifier.statusUpdate(id, {
                status: "dismissed",
                publicNote: updated.dismissalNote,
                hearingAt: null,
            });
        }
    },

    async addServiceRecord(req: Request, res: Response): Promise<void> {
        const id = Number(req.params.id);

        if (!id || isNaN(id)) {
            throw new CustomError("Invalid complaint ID", undefined, 400);
        }

        const input = validateRequest(createServiceRecordSchema, req.body);
        const result = await complaintService.addServiceRecord(
            id,
            input,
            req.user?.userId,
        );

        res.status(201).json({
            success: true,
            dueAt: result.dueAt ? result.dueAt.toISOString() : null,
            deadlineUpdated: result.deadlineUpdated,
        });

        await auditFromRequest(req, {
            action: "complaint.service.record",
            entityType: "complaint",
            entityId: id,
            summary: `${result.reference}: proof of service recorded (${input.result}) by ${input.serverName}`,
            meta: {
                result: input.result,
                serverName: input.serverName,
                deadlineUpdated: result.deadlineUpdated,
                dueAt: result.dueAt ? result.dueAt.toISOString() : null,
            },
        });
    },

    async reopenCase(req: Request, res: Response) {
        const id = Number(req.params.id);
        const { reason } = req.body;
        const userId = req.user?.userId;

        if (!id || isNaN(id)) {
            throw new CustomError("Invalid complaint ID", undefined, 400);
        }

        if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
            throw new CustomError("A reason for reopening is required", undefined, 400);
        }

        const reopened = await complaintService.reopenCase(id, reason, userId);
        res.json({ success: true, message: "Case reopened successfully" });

        await auditFromRequest(req, {
            action: "complaint.reopen",
            entityType: "complaint",
            entityId: id,
            summary: `Reopened ${reopened.reference}: ${reason}`,
            meta: { reason },
        });
    }
}

export default complaintController;
