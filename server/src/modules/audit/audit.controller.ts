import type { Request, Response } from "express";

import { validateRequest } from "../../utils/custom.validator.js";
import auditService from "./audit.service.js";
import { exportAuditQuerySchema, listAuditQuerySchema } from "./audit.schema.js";

const auditController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = validateRequest(listAuditQuerySchema, req.query);
    res.json(await auditService.list(query));
  },

  async export(req: Request, res: Response): Promise<void> {
    const query = validateRequest(exportAuditQuerySchema, req.query);
    res.json(await auditService.exportAll(query));
  },
};

export default auditController;
