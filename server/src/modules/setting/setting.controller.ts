import type { Request, Response } from "express";

import { validateRequest } from "../../utils/custom.validator.js";
import { CustomError } from "../../utils/custom.exception.js";
import settingService from "./setting.service.js";
import { updateSettingsSchema } from "./setting.schema.js";
import { auditFromRequest } from "../audit/audit.service.js";
import smsService from "../sms/sms.service.js";
import emailService from "../email/email.service.js";

const settingController = {
  async get(_req: Request, res: Response): Promise<void> {
    res.json(await settingService.get());
  },

  async channels(_req: Request, res: Response): Promise<void> {
    res.json({
      sms: smsService.isSmsEnabled(),
      email: emailService.isEmailEnabled(),
    });
  },

  async update(req: Request, res: Response): Promise<void> {
    const input = validateRequest(updateSettingsSchema, req.body);
    const settings = await settingService.update(input);
    res.json(settings);

    await auditFromRequest(req, {
      action: "setting.update",
      entityType: "setting",
      summary: `Updated barangay settings (${settings.barangayName})`,
    });
  },

  async upload(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new CustomError("No image uploaded", undefined, 400);
    }

    res.json({ url: `/uploads/${req.file.filename}` });
  },
};

export default settingController;
