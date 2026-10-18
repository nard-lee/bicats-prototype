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

  async getOverview(req: Request, res: Response) {
    try {
      res.json(await analyticsService.getOverview());
    } catch (err) {
      res.status(500).json({ error: "Failed to load overview" });
    }
  },
};