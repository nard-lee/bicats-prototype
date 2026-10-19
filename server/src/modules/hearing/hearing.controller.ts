import type { Request, Response } from "express";

import { validateRequest } from "../../utils/custom.validator.js";
import { CustomError } from "../../utils/custom.exception.js";
import { auditFromRequest } from "../audit/audit.service.js";
import hearingService from "./hearing.service.js";
import {
  createHearingSchema,
  listHearingsSchema,
  updateHearingSchema,
} from "./hearing.schema.js";

function handleError(res: Response, err: unknown, fallback: string): void {
  if (err instanceof CustomError) {
    res.status(err.statusCode).json({ error: err.message, fields: err.fields });
    return;
  }
  res.status(500).json({ error: fallback });
}

const KIND_LABEL: Record<string, string> = {
  mediation: "mediation",
  conciliation: "conciliation",
  hearing: "arbitration",
};

const hearingController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const filters = validateRequest(listHearingsSchema, req.query);
      res.json({ items: await hearingService.list(filters) });
    } catch (err) {
      handleError(res, err, "Failed to load mediation");
    }
  },

  async complaintOptions(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ items: await hearingService.complaintOptions() });
    } catch (err) {
      handleError(res, err, "Failed to load complaints");
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const input = validateRequest(createHearingSchema, req.body);
      const created = await hearingService.create(input, req.user?.userId);
      res.status(201).json({ success: true, ...created });

      await auditFromRequest(req, {
        action: "hearing.create",
        entityType: "hearing",
        entityId: created.id,
        summary: `Scheduled a ${KIND_LABEL[input.kind] ?? "mediation"} session for case #${input.complaintId}`,
        meta: { complaintId: input.complaintId, kind: input.kind, scheduledAt: input.scheduledAt.toISOString() },
      });
    } catch (err) {
      handleError(res, err, "Failed to schedule mediation");
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid mediation ID" });
      return;
    }

    try {
      const input = validateRequest(updateHearingSchema, req.body);
      await hearingService.update(id, input);
      res.json({ success: true });

      await auditFromRequest(req, {
        action: "hearing.update",
        entityType: "hearing",
        entityId: id,
        summary: `Updated mediation session #${id}`,
        ...(input.status ? { meta: { status: input.status } } : {}),
      });
    } catch (err) {
      handleError(res, err, "Failed to update mediation");
    }
  },

  async cancel(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid mediation ID" });
      return;
    }

    try {
      await hearingService.cancel(id);
      res.json({ success: true });

      await auditFromRequest(req, {
        action: "hearing.cancel",
        entityType: "hearing",
        entityId: id,
        summary: `Cancelled mediation session #${id}`,
      });
    } catch (err) {
      handleError(res, err, "Failed to cancel mediation");
    }
  },
};

export default hearingController;
