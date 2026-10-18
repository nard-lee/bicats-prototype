import { prisma } from "../db.js";
import {
  complaintRisk,
  TERMINAL_STATUSES,
} from "../modules/complaint/complaint.schema.js";

const DAY = 24 * 60 * 60 * 1000;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function prettyDate(date: Date): string {
  return date.toLocaleDateString("en-PH", { dateStyle: "medium" });
}

/**
 * Scan open cases whose KP deadline is within the next day (or already past)
 * and create one in-app notification per active staff member, per case, per
 * day. Dedupe keys keep the scan idempotent.
 */
export async function runReminderScan(): Promise<number> {
  const now = new Date();
  const soon = new Date(now.getTime() + DAY);

  const cases = await prisma.complaint.findMany({
    where: {
      status: { notIn: [...TERMINAL_STATUSES] },
      dueAt: { not: null, lte: soon },
    },
    select: { id: true, reference: true, status: true, dueAt: true },
  });

  if (cases.length === 0) return 0;

  const staff = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["admin", "staff"] } },
    select: { id: true },
  });

  if (staff.length === 0) return 0;

  const stamp = dayKey(now);

  const rows = cases.flatMap((complaint) => {
    const dueAt = complaint.dueAt;
    if (!dueAt) return [];

    const risk = complaintRisk(dueAt, complaint.status);
    if (risk !== "overdue" && risk !== "due_soon") return [];

    const overdue = risk === "overdue";

    return staff.map((member) => ({
      userId: member.id,
      type: overdue ? "overdue" : "reminder",
      title: overdue
        ? `${complaint.reference} is overdue`
        : `${complaint.reference} is due soon`,
      body: overdue
        ? `The current Katarungang Pambarangay step for ${complaint.reference} passed its deadline on ${prettyDate(dueAt)}.`
        : `The next Katarungang Pambarangay step for ${complaint.reference} is due by ${prettyDate(dueAt)}.`,
      complaintId: complaint.id,
      reference: complaint.reference,
      dedupeKey: `${risk}:${complaint.id}:${stamp}:${member.id}`,
    }));
  });

  if (rows.length === 0) return 0;

  const result = await prisma.notification.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return result.count;
}

export function startReminderJob(): void {
  const INTERVAL_MS = 30 * 60 * 1000;

  const run = () => {
    runReminderScan()
      .then((count) => {
        if (count > 0) {
          console.log(`==> reminders: created ${count} notification(s)`);
        }
      })
      .catch((err: unknown) => {
        console.error("==> reminders: scan failed", err);
      });
  };

  // Give the server a moment to boot before the first scan.
  setTimeout(run, 5_000).unref();
  setInterval(run, INTERVAL_MS).unref();
}
