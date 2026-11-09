import type { Request, Response } from "express";

import { validateRequest } from "../../utils/custom.validator.js";
import { CustomError } from "../../utils/custom.exception.js";
import { auditFromRequest } from "../audit/audit.service.js";
import { runSideEffect } from "../../utils/side-effect.js";
import complainantNotifier from "../notify/complainant.notifier.js";
import { kindLabel } from "../notify/labels.js";
import hearingService from "./hearing.service.js";
import {
  createHearingSchema,
  listHearingsSchema,
  recordAttendanceSchema,
  updateHearingSchema,
} from "./hearing.schema.js";
import type { HearingKind } from "./hearing.types.js";

// The audit trail is written in English, and the resident-facing wording
// already names each session type, so both stay in step by using it.
const kindWord = (kind: HearingKind) => kindLabel(kind, "en");

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

    // A past session saved as completed/no-show is a record, not a booking,
    // so it is audited and announced differently.
    const held = created.status !== "scheduled";

    await auditFromRequest(req, {
      action: "hearing.create",
      entityType: "hearing",
      entityId: created.id,
      summary: held
        ? `Recorded a ${kindWord(created.kind)} session held for ${created.reference}`
        : `Scheduled a ${kindWord(created.kind)} session for ${created.reference}`,
      meta: { complaintId: input.complaintId, reference: created.reference, kind: created.kind, status: created.status, scheduledAt: input.scheduledAt.toISOString() },
    });

    // Text/email the complainant that their session is booked. A session
    // recorded after the fact is not news to them. The saved row decides the
    // venue because a blank request inherits the settings default.
    if (!held) {
      runSideEffect(
        `notifications: ${kindWord(created.kind)} scheduled`,
        complainantNotifier.mediationScheduled(input.complaintId, {
          kind: created.kind,
          scheduledAt: input.scheduledAt,
          location: created.location,
        }),
      );
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      throw new CustomError("Invalid session ID", undefined, 400);
    }

    const input = validateRequest(updateHearingSchema, req.body);
    const updated = await hearingService.update(id, input, req.user?.userId);
    res.json({ success: true });

    // Moving a session into the past is only allowed as a record of a session
    // that was already held, so it is not an announcement either.
    const held = input.status === "completed" || input.status === "no_show";

    await auditFromRequest(req, {
      action: "hearing.update",
      entityType: "hearing",
      entityId: id,
      summary:
        updated.rescheduled && !held
          ? `Rescheduled ${kindWord(updated.kind)} for ${updated.reference}`
          : updated.rescheduled
            ? `Recorded a ${kindWord(updated.kind)} session held for ${updated.reference}`
            : input.status
              ? `Marked ${kindWord(updated.kind)} for ${updated.reference} as ${input.status.replace("_", " ")}`
              : `Updated ${kindWord(updated.kind)} details for ${updated.reference}`,
      meta: {
        reference: updated.reference,
        ...(input.status ? { status: input.status } : {}),
        ...(input.scheduledAt ? { scheduledAt: input.scheduledAt.toISOString() } : {}),
      },
    });

    // Text/email the complainant when the session moved or came back after a
    // cancellation. The saved row supplies the venue and date, so a save that
    // only flips the status still names where and when.
    if ((updated.rescheduled || updated.reopened) && !held) {
      runSideEffect(
        `notifications: ${kindWord(updated.kind)} rescheduled`,
        complainantNotifier.mediationScheduled(updated.complaintId, {
          kind: updated.kind,
          scheduledAt: updated.scheduledAt,
          location: updated.location,
          rescheduled: updated.rescheduled,
        }),
      );
    }

    if (input.status === "cancelled" && updated.previousStatus !== "cancelled") {
      runSideEffect(
        `notifications: ${kindWord(updated.kind)} cancelled`,
        complainantNotifier.mediationCancelled(updated.complaintId, {
          kind: updated.kind,
        }),
      );
    }
  },

  async recordAttendance(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      throw new CustomError("Invalid session ID", undefined, 400);
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
      summary: `Recorded attendance for ${kindWord(recorded.kind)} on ${recorded.reference}: complainant ${input.complainant}, respondent ${input.respondent}`,
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
      throw new CustomError("Invalid session ID", undefined, 400);
    }

    const cancelled = await hearingService.cancel(id);
    res.json({ success: true });

    await auditFromRequest(req, {
      action: "hearing.cancel",
      entityType: "hearing",
      entityId: id,
      summary: `Cancelled ${kindWord(cancelled.kind)} for ${cancelled.reference}`,
      meta: { reference: cancelled.reference },
    });

    // Text/email the complainant their session is cancelled — once, matching
    // the PATCH guard above, so a repeat cancel doesn't alert again.
    if (cancelled.previousStatus !== "cancelled") {
      runSideEffect(
        `notifications: ${kindWord(cancelled.kind)} cancelled`,
        complainantNotifier.mediationCancelled(cancelled.complaintId, {
          kind: cancelled.kind,
        }),
      );
    }
  },
};

export default hearingController;
