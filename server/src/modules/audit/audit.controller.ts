import type { Request, Response } from "express";

import { validateRequest } from "../../utils/custom.validator.js";
import { CustomError } from "../../utils/custom.exception.js";
import auditService from "./audit.service.js";
import { listAuditQuerySchema } from "./audit.schema.js";

const auditController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const query = validateRequest(listAuditQuerySchema, req.query);
      res.json(await auditService.list(query));
    } catch (err: unknown) {
      if (err instanceof CustomError) {
        res.status(400).json({ error: err.message, fields: err.fields });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default auditController;
