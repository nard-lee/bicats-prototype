import type { ComplaintStatus } from "../loader";

export const STATUSES: ComplaintStatus[] = [
  "received",
  "summoned",
  "mediation",
  "conciliation",
  "arbitration",
  "settled",
  "certified",
  "dismissed",
];
