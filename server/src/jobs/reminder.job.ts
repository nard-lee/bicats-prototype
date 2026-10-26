import { prisma } from "../db.js";
import complainantNotifier from "../modules/notify/complainant.notifier.js";
import {
  complaintRisk,
  TERMINAL_STATUSES,
} from "../modules/complaint/complaint.schema.js";
import { INTERNAL_ROLES } from "../utils/roles.js";
import notificationService from "../modules/notification/notification.service.js";
import settingService from "../modules/setting/setting.service.js";
import { isHearingOverdue } from "../modules/hearing/hearing.schema.js";

const DAY = 24 * 60 * 60 * 1000;

const HEARING_KIND_LABEL: Record<string, string> = {
  mediation: "mediation",
  conciliation: "conciliation",
  hearing: "arbitration",
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function prettyDate(date: Date): string {
  return date.toLocaleDateString("en-PH", { dateStyle: "medium" });
}

/**
 * Scan open cases whose KP deadline is within the next day (or already past):
 *  1. create one in-app notification per active staff member, per case, per day, and
 *  2. remind staff about mediation sessions whose date has passed without an outcome,
 *  3. remind the parties (and staff) about scheduled sessions inside the
 *     configured lead time.
 * Dedupe keys keep the scan idempotent.
 */
export async function runReminderScan(): Promise<number> {
  const now = new Date();

  await notificationService.prune();

  const settings = await settingService.get();
  const windowDays = settings.riskWindowDays;
  const soon = new Date(now.getTime() + windowDays * DAY);

  const cases = await prisma.complaint.findMany({
    where: {
      status: { notIn: [...TERMINAL_STATUSES] },
      dueAt: { not: null, lte: soon },
    },
    select: { id: true, reference: true, status: true, dueAt: true },
  });

  const [overdueHearings, staff] = await Promise.all([
    prisma.hearing.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lt: now },
        complaint: { status: { notIn: [...TERMINAL_STATUSES] } },
      },
      select: {
        id: true,
        complaintId: true,
        scheduledAt: true,
        kind: true,
        status: true,
        complaint: { select: { reference: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: [...INTERNAL_ROLES] } },
      select: { id: true },
    }),
  ]);

  if (staff.length === 0) return 0;

  const stamp = dayKey(now);

  // ---- Daily deadline reminders ----
  const reminderRows = cases.flatMap((complaint) => {
    const dueAt = complaint.dueAt;
    if (!dueAt) return [];

    const risk = complaintRisk(dueAt, complaint.status, windowDays);
    if (risk !== "overdue" && risk !== "due_soon") return [];

    const overdue = risk === "overdue";

    return staff.map((member) => ({
      userId: member.id,
      type: overdue ? "overdue" : "reminder",
      title: overdue
        ? `${complaint.reference} step deadline passed`
        : `${complaint.reference} next step due within ${windowDays} day(s)`,
      body: overdue
        ? `The deadline for the case's current stage lapsed on ${prettyDate(dueAt)}. Open the case, record the outcome, and schedule the next KP step (summon, mediation, or conciliation).`
        : `The next KP step for this case must be recorded by ${prettyDate(dueAt)} or the case will start going into overdue.`,
      complaintId: complaint.id,
      reference: complaint.reference,
      dedupeKey: `${risk}:${complaint.id}:${stamp}:${member.id}`,
    }));
  });

  // ---- Missed sessions that still have no outcome on record ----
  const hearingRows = overdueHearings
    .filter((hearing) =>
      isHearingOverdue(
        hearing.scheduledAt,
        hearing.status,
        now,
        settings.hearingGraceHours,
      ),
    )
    .flatMap((hearing) => {
      const label = HEARING_KIND_LABEL[hearing.kind] ?? "mediation";
      const reference = hearing.complaint.reference;

      return staff.map((member) => ({
        userId: member.id,
        type: "hearing_overdue",
        title: `${reference}: missed ${label} session on ${prettyDate(hearing.scheduledAt)}`,
        body: `The ${label} session did not end with a recorded outcome. Close it out as completed, no-show, or reschedule a new date so the case can move.`,
        complaintId: hearing.complaintId,
        reference,
        dedupeKey: `hearing_overdue:${hearing.id}:${stamp}:${member.id}`,
      }));
    });

  const rows = [...reminderRows, ...hearingRows];

  // ---- Pre-session reminders to the complainant (and staff) ----
  const leadHours = settings.reminderLeadHours;
  const leadWindow = new Date(now.getTime() + leadHours * 60 * 60 * 1000);
  const upcoming = await prisma.hearing.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { gte: now, lte: leadWindow },
      complaint: { status: { notIn: [...TERMINAL_STATUSES] } },
    },
    select: {
      id: true,
      complaintId: true,
      kind: true,
      scheduledAt: true,
      location: true,
      complaint: { select: { reference: true } },
    },
  });

  const prefixes = upcoming.map((hearing) => `hearing_upcoming:${hearing.id}:${stamp}:`);
  const existing =
    prefixes.length > 0
      ? await prisma.notification.findMany({
          where: { OR: prefixes.map((prefix) => ({ dedupeKey: { startsWith: prefix } })) },
          select: { dedupeKey: true },
        })
      : [];
  const fresh = upcoming.filter(
    (hearing) =>
      !existing.some((row) =>
        (row.dedupeKey ?? "").startsWith(`hearing_upcoming:${hearing.id}:${stamp}:`),
      ),
  );

  const upcomingRows = fresh.flatMap((hearing) => {
    const label = HEARING_KIND_LABEL[hearing.kind] ?? "mediation";
    const reference = hearing.complaint.reference;

    return staff.map((member) => ({
      userId: member.id,
      type: "hearing_upcoming",
      title: `${reference}: ${label} session within ${leadHours} hours`,
      body: `The ${label} session starts ${prettyDate(hearing.scheduledAt)}. Confirm attendance and prepare the venue.`,
      complaintId: hearing.complaintId,
      reference,
      dedupeKey: `hearing_upcoming:${hearing.id}:${stamp}:${member.id}`,
    }));
  });

  for (const hearing of fresh) {
    await complainantNotifier.hearingReminder(hearing.complaintId, {
      kind: hearing.kind,
      scheduledAt: hearing.scheduledAt,
      location: hearing.location,
    });
  }

  const allRows = [...rows, ...upcomingRows];
  if (allRows.length === 0) return 0;

  return notificationService.createForUsers(allRows);
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
