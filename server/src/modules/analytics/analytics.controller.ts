import type { Request, Response } from "express";
import { analyticsService } from "./analytics.service.js";
import { CustomError } from "@/utils/custom.exception.js";

function parseMonth(
  value: unknown,
  fallback: { year: number; month: number },
): { year: number; month: number } | null {
  if (value === undefined || value === "") return fallback;
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month };
}

export const analyticsController = {
  async getReport(_req: Request, res: Response) {
    const [types, hotspots, trends, statusDist] = await Promise.all([
      analyticsService.getComplaintTypes(),
      analyticsService.getHotspots(),
      analyticsService.getMonthlyTrends(),
      analyticsService.getStatusDistribution(),
    ]);
    res.json({ types, hotspots, trends, statusDist });
  },

  async getDigest(req: Request, res: Response) {
    // from/to=YYYY-MM, both optional and defaulting to the current month
    const now = new Date();
    const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
    const from = parseMonth(req.query.from, current);
    const to = parseMonth(req.query.to, current);

    if (!from || !to) {
      throw new CustomError("Invalid month, expected YYYY-MM", undefined, 400);
    }
    if (from.year * 12 + from.month > to.year * 12 + to.month) {
      throw new CustomError("`from` must not be after `to`", undefined, 400);
    }

    res.json(await analyticsService.getDigestRange(from.year, from.month, to.year, to.month));
  },

  async getStats(_req: Request, res: Response) {
    res.json(await analyticsService.getStats());
  },

  async getOverview(req: Request, res: Response) {
    res.json(await analyticsService.getOverview());
  },
};
