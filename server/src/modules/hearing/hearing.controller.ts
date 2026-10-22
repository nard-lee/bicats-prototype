import type { Request, Response } from "express";

import { validateRequest } from "../../utils/custom.validator.js";
import { CustomError } from "../../utils/custom.exception.js";
import { auditFromRequest } from "../audit/audit.service.js";
import complainantNotifier from "../notify/complainant.notifier.js";
import hearingService from "./hearing.service.js";
import {
  createHearingSchema,
  listHearingsSchema,
  recordAttendanceSchema,
  updateHearingSchema,
} from "./hearing.schema.js";

const KIND_LABEL: Record<string, string> = {
  mediation: "mediation",
  conciliation: "conciliation",
  hearing: "arbitration",
};

const hearingController = {
  async list(req: Request, res: Response): Promise<void> {
    const filters = validateRequest(listHearingsSchema, req.query);
    res.json({ items: await hearingService.list(filters) });
  },

  async complaintOptions(_req: Request, res: Response): Promise<void> {
    res.json({ items: await hearingService.complaintOptions() });
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = validateRequest(createHearingSchema, req.body);
    const created = await hearingService.create(input, req.user?.userId);
    res.status(201).json({ success: true, ...created });

    await auditFromRequest(req, {
      action: "hearing.create",
      entityType: "hearing",
      entityId: created.id,
      summary: `Scheduled a ${KIND_LABEL[input.kind] ?? "mediation"} session for ${created.reference}`,
      meta: { complaintId: input.complaintId, reference: created.reference, kind: input.kind, scheduledAt: input.scheduledAt.toISOString() },
    });

    // Text/email the complainant that their session is booked.
    void complainantNotifier.mediationScheduled(input.complaintId, {
      kind: input.kind,
      scheduledAt: input.scheduledAt,
      location: input.location ?? null,
    });
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      throw new CustomError("Invalid mediation ID", undefined, 400);
    }

    const input = validateRequest(updateHearingSchema, req.body);
    const updated = await hearingService.update(id, input);
    res.json({ success: true });

    await auditFromRequest(req, {
      action: "hearing.update",
      entityType: "hearing",
      entityId: id,
      summary: updated.rescheduled
        ? `Rescheduled mediation for ${updated.reference}`
        : input.status
          ? `Marked mediation for ${updated.reference} as ${input.status.replace("_", " ")}`
          : `Updated mediation details for ${updated.reference}`,
      meta: {
        reference: updated.reference,
        ...(input.status ? { status: input.status } : {}),
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt.toISOString() } : {}),
      },
    });

    // Text/email the complainant only when the session actually moved.
    if (updated.rescheduled && input.scheduledAt && input.status !== "cancelled") {
      void complainantNotifier.mediationScheduled(updated.complaintId, {
        kind: updated.kind,
        scheduledAt: input.scheduledAt,
        location: input.location ?? null,
        rescheduled: true,
      });
    }

    if (input.status === "cancelled" && updated.previousStatus !== "cancelled") {
      void complainantNotifier.mediationCancelled(updated.complaintId, {
        kind: updated.kind,
      });
    }
  },

  async recordAttendance(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      throw new CustomError("Invalid mediation ID", undefined, 400);
    }

    const input = validateRequest(recordAttendanceSchema, req.body);
    const recorded = await hearingService.recordAttendance(id, input);
    res.json({
      success: true,
      status: recorded.status,
      statusChanged: recorded.statusChanged,
    });

    await auditFromRequest(req, {
      action: "hearing.attendance",
      entityType: "hearing",
      entityId: id,
      summary: `Recorded attendance for ${KIND_LABEL[recorded.kind] ?? "mediation"} on ${recorded.reference}: complainant ${input.complainant}, respondent ${input.respondent}`,
      meta: {
        reference: recorded.reference,
        complainant: input.complainant,
        respondent: input.respondent,
        status: recorded.status,
        statusChanged: recorded.statusChanged,
      },
    });
  },

  async cancel(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      throw new CustomError("Invalid mediation ID", undefined, 400);
    }

    const cancelled = await hearingService.cancel(id);
    res.json({ success: true });

    await auditFromRequest(req, {
      action: "hearing.cancel",
      entityType: "hearing",
      entityId: id,
      summary: `Cancelled mediation for ${cancelled.reference}`,
      meta: { reference: cancelled.reference },
    });

    // Text/email the complainant their session is cancelled.
    void complainantNotifier.mediationCancelled(cancelled.complaintId, {
      kind: cancelled.kind,
    });
  },
};

export default hearingController;
