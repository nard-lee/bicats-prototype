import type { Request, Response } from "express";
import { analyticsService } from "./analytics.service.js";

export const analyticsController = {
  async getReport(req: Request, res: Response) {
    try {
      const [types, hotspots, trends, statusDist] = await Promise.all([
        analyticsService.getComplaintTypes(),
        analyticsService.getHotspots(),
        analyticsService.getMonthlyTrends(),
        analyticsService.getStatusDistribution(),
      ]);
      res.json({ types, hotspots, trends, statusDist });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate report" });
    }
  },

  async getDigest(req: Request, res: Response) {
    try {
      // month=YYYY-MM, defaults to the current month
      const raw = typeof req.query.month === "string" ? req.query.month : "";
      const match = /^(\d{4})-(\d{2})$/.exec(raw);
      const now = new Date();
      const year = match ? Number(match[1]) : now.getUTCFullYear();
      const month = match ? Number(match[2]) : now.getUTCMonth() + 1;

      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        res.status(400).json({ error: "Invalid month, expected YYYY-MM" });
        return;
      }

      res.json(await analyticsService.getMonthlyDigest(year, month));
    } catch (err) {
      res.status(500).json({ error: "Failed to generate digest" });
    }
  },

  async getOverview(req: Request, res: Response) {
    try {
      res.json(await analyticsService.getOverview());
    } catch (err) {
      res.status(500).json({ error: "Failed to load overview" });
    }
  },
};