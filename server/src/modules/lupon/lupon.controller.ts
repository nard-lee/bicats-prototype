import type { Request, Response } from "express";

import { validateRequest } from "../../utils/custom.validator.js";
import { CustomError } from "../../utils/custom.exception.js";
import luponService from "./lupon.service.js";
import {
  createLuponMemberSchema,
  updateLuponMemberSchema,
} from "./lupon.schema.js";

function memberId(req: Request): number {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    throw new CustomError("Invalid Lupon member ID", undefined, 400);
  }

  return id;
}

const luponController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json({ items: await luponService.list() });
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = validateRequest(createLuponMemberSchema, req.body);
    const created = await luponService.create(input);
    res.status(201).json({ success: true, ...created });
  },

  async update(req: Request, res: Response): Promise<void> {
    const input = validateRequest(updateLuponMemberSchema, req.body);
    const updated = await luponService.update(memberId(req), input);
    res.json({ success: true, ...updated });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const removed = await luponService.remove(memberId(req));
    res.json({ success: true, fullName: removed.fullName });
  },
};

export default luponController;
