import type { Request, Response } from "express";
import { createNoticeSchema, updateNoticeSchema } from "./notice.schema.js";
import { validateRequest } from "@/utils/custom.validator.js";
import { noticeService } from "./notice.service.js";
import { CustomError } from "@/utils/custom.exception.js";
import { auditFromRequest } from "@/modules/audit/audit.service.js";

function parseId(raw: string | string[] | undefined): number {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);

  if (!Number.isInteger(id) || id <= 0) {
    throw new CustomError("Invalid notice ID", undefined, 400);
  }

  return id;
}

function parsePagination(query: Request["query"], defaultPageSize = 20) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Math.floor(Number(query.pageSize)) || defaultPageSize),
  );

  return { page, pageSize };
}

export const noticeController = {
  // Public notice board: published notices only.
  async listPublished(req: Request, res: Response): Promise<void> {
    const { page, pageSize } = parsePagination(req.query, 6);
    res.json(await noticeService.list(page, pageSize, true));
  },

  // Staff/admin management view: includes drafts.
  async listAll(req: Request, res: Response): Promise<void> {
    const { page, pageSize } = parsePagination(req.query);
    res.json(await noticeService.list(page, pageSize, false));
  },

  async create(req: Request, res: Response): Promise<void> {
    const data = validateRequest(createNoticeSchema, req.body);
    const notice = await noticeService.create(data, req.user?.userId);
    res.status(201).json(notice);

    await auditFromRequest(req, {
      action: "notice.create",
      entityType: "notice",
      entityId: notice.id,
      summary: `Published notice "${notice.title}"`,
    });
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = parseId(req.params.id);
    const data = validateRequest(updateNoticeSchema, req.body);
    const notice = await noticeService.update(id, data);
    res.json(notice);

    await auditFromRequest(req, {
      action: "notice.update",
      entityType: "notice",
      entityId: id,
      summary: `Updated notice "${notice.title}"`,
    });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const id = parseId(req.params.id);
    await noticeService.remove(id);
    res.json({ success: true });

    await auditFromRequest(req, {
      action: "notice.delete",
      entityType: "notice",
      entityId: id,
      summary: `Deleted notice #${id}`,
    });
  },
};
