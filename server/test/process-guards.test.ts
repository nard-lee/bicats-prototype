import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import { runReminderScan } from "../src/jobs/reminder.job.js";
import { createUser, csrfToken, loginAgent, submitComplaint } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function filedComplaintId(): Promise<number> {
  const publicAgent = request.agent(app);
  const publicToken = await csrfToken(publicAgent);
  const filed = await submitComplaint(publicAgent, publicToken).expect(200);

  const complaint = await prisma.complaint.findUnique({
    where: { reference: filed.body.reference as string },
    select: { id: true },
  });

  return complaint!.id;
}

async function schedule(
  agent: ReturnType<typeof request.agent>,
  token: string,
  complaintId: number,
  scheduledAt: Date,
): Promise<number> {
  const created = await agent
    .post("/api/hearings")
    .set("x-csrf-token", token)
    .send({ complaintId, scheduledAt: scheduledAt.toISOString(), kind: "mediation" })
    .expect(201);

  return created.body.id as number;
}

describe("complaint lifecycle guards", () => {
  it("keeps the deadline and skips duplicate history for note-only saves", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    const before = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { dueAt: true },
    });

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "received", publicNote: "Called the complainant." })
      .expect(200);

    const afterNote = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { updates: { orderBy: { createdAt: "asc" } } },
    });
    expect(afterNote!.status).toBe("received");
    expect(afterNote!.dueAt?.getTime()).toBe(before!.dueAt?.getTime());
    expect(afterNote!.updates).toHaveLength(2);
    expect(afterNote!.updates[1]!.status).toBe("received");
    expect(afterNote!.updates[1]!.publicNote).toBe("Called the complainant.");

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "received" })
      .expect(200);

    expect(
      await prisma.statusUpdate.count({ where: { complaintId } }),
    ).toBe(2);
  });

  it("enforces the KP stage graph and locks closed cases", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const reopenTarget = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    const skip = await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "settled" })
      .expect(409);
    expect(skip.body.message).toContain('from "received" to "settled"');

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "conciliation" })
      .expect(409);

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "dismissed" })
      .expect(200);

    const closed = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { status: true, dueAt: true, priority: true },
    });
    expect(closed).toEqual({ status: "dismissed", dueAt: null, priority: "none" });

    const reversed = await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "mediation" })
      .expect(409);
    expect(reversed.body.message).toContain("This case is closed");

    const bulkReversed = await agent
      .post("/api/complaints/bulk-status")
      .set("x-csrf-token", token)
      .send({ ids: [complaintId], status: "settled" })
      .expect(409);
    expect(bulkReversed.body.message).toContain("Can't move");

    const lockedEligibility = await agent
      .patch(`/api/complaints/${complaintId}/eligibility`)
      .set("x-csrf-token", token)
      .send({ eligibilityStatus: "outside_kp" })
      .expect(409);
    expect(lockedEligibility.body.message).toContain("closed");

    const stillEligible = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { status: true, eligibilityStatus: true },
    });
    expect(stillEligible).toEqual({
      status: "dismissed",
      eligibilityStatus: "eligible",
    });

    const openReopen = await agent
      .post(`/api/complaints/${reopenTarget}/reopen`)
      .set("x-csrf-token", token)
      .send({ reason: "Filed by mistake" })
      .expect(409);
    expect(openReopen.body.message).toBe("Only closed cases can be reopened.");
  });

  it("lets eligibility screening dismiss a case that reached mediation", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);

    const hearingId = await schedule(
      agent,
      token,
      complaintId,
      new Date(Date.now() + DAY_MS),
    );

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "mediation" })
      .expect(200);

    await agent
      .patch(`/api/complaints/${complaintId}/eligibility`)
      .set("x-csrf-token", token)
      .send({ eligibilityStatus: "outside_kp" })
      .expect(200);

    const closed = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: {
        status: true,
        dueAt: true,
        priority: true,
        eligibilityStatus: true,
      },
    });
    expect(closed).toEqual({
      status: "dismissed",
      dueAt: null,
      priority: "none",
      eligibilityStatus: "outside_kp",
    });

    const hearing = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(hearing!.status).toBe("cancelled");

    const entry = await prisma.statusUpdate.findFirst({
      where: { complaintId, status: "dismissed" },
    });
    expect(entry!.publicNote).toContain("outside the authority");
  });

  it("cancels scheduled sessions and clears reminders when a case closes", async () => {
    const admin = await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);

    const hearingId = await schedule(
      agent,
      token,
      complaintId,
      new Date(Date.now() + DAY_MS),
    );

    const reference = (
      await prisma.complaint.findUnique({
        where: { id: complaintId },
        select: { reference: true },
      })
    )!.reference;

    await prisma.notification.createMany({
      data: [
        {
          userId: admin.id,
          type: "hearing_overdue",
          title: `${reference}: missed mediation session`,
          body: "Seeded reminder",
          complaintId,
          reference,
          dedupeKey: `hearing_overdue:${hearingId}:seed:${admin.id}`,
        },
        {
          userId: admin.id,
          type: "hearing_upcoming",
          title: `${reference}: mediation within 24 hours`,
          body: "Seeded reminder",
          complaintId,
          reference,
          dedupeKey: `hearing_upcoming:${hearingId}:seed:${admin.id}`,
        },
      ],
    });

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "dismissed", publicNote: "Withdrawn by the complainant." })
      .expect(200);

    const hearing = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(hearing!.status).toBe("cancelled");

    expect(
      await prisma.notification.count({
        where: {
          OR: [
            { dedupeKey: { startsWith: `hearing_overdue:${hearingId}:` } },
            { dedupeKey: { startsWith: `hearing_upcoming:${hearingId}:` } },
          ],
        },
      }),
    ).toBe(0);

    const blockedSchedule = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: new Date(Date.now() + 2 * DAY_MS).toISOString(),
        kind: "mediation",
      })
      .expect(409);
    expect(blockedSchedule.body.message).toContain("closed");

    // Legacy row: a session left scheduled on a case that closed before the
    // guard existed. Attendance is refused and the scan no longer alerts on it.
    const legacy = await prisma.hearing.create({
      data: {
        complaintId,
        scheduledAt: new Date(Date.now() - DAY_MS),
        kind: "mediation",
        status: "scheduled",
      },
    });

    const blockedAttendance = await agent
      .put(`/api/hearings/${legacy.id}/attendance`)
      .set("x-csrf-token", token)
      .send({ complainant: "present", respondent: "present" })
      .expect(409);
    expect(blockedAttendance.body.message).toContain("already closed");

    await runReminderScan();

    expect(
      await prisma.notification.count({
        where: { type: { in: ["hearing_overdue", "hearing_upcoming"] } },
      }),
    ).toBe(0);
  });

  it("rejects status-form sessions that clash with existing slots", async () => {
    await createUser("admin");
    const firstId = await filedComplaintId();
    const secondId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${firstId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);
    await agent
      .patch(`/api/complaints/${secondId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);

    const firstSlot = new Date(Date.now() + DAY_MS);
    firstSlot.setUTCHours(2, 0, 0, 0); // 10:00 in the Philippines
    const secondSlot = new Date(firstSlot.getTime() + 5 * 60 * 60 * 1000);
    await schedule(agent, token, firstId, firstSlot);
    await schedule(agent, token, secondId, secondSlot);

    const taken = await agent
      .patch(`/api/complaints/${secondId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "mediation", hearingAt: firstSlot.toISOString() })
      .expect(409);
    expect(taken.body.message).toContain("already scheduled at that time");

    const afterClash = await prisma.complaint.findUnique({
      where: { id: secondId },
      select: { status: true, hearings: { select: { scheduledAt: true } } },
    });
    expect(afterClash!.status).toBe("summoned");
    expect(afterClash!.hearings).toHaveLength(1);
    expect(afterClash!.hearings[0]!.scheduledAt.getTime()).toBe(
      secondSlot.getTime(),
    );

    const freeSlot = new Date(firstSlot.getTime() + 2 * 60 * 60 * 1000);
    await agent
      .patch(`/api/complaints/${secondId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "mediation", hearingAt: freeSlot.toISOString() })
      .expect(200);

    const moved = await prisma.complaint.findUnique({
      where: { id: secondId },
      select: {
        status: true,
        hearings: { orderBy: { scheduledAt: "asc" }, select: { scheduledAt: true } },
      },
    });
    expect(moved!.status).toBe("mediation");
    expect(moved!.hearings).toHaveLength(1);
    expect(moved!.hearings[0]!.scheduledAt.getTime()).toBe(freeSlot.getTime());
  });

  it("bulk-closes like a single update and only reopens closed cases", async () => {
    await createUser("admin");
    const firstId = await filedComplaintId();
    const secondId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${firstId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);
    const hearingId = await schedule(
      agent,
      token,
      firstId,
      new Date(Date.now() + DAY_MS),
    );

    await agent
      .patch(`/api/complaints/${secondId}/priority`)
      .set("x-csrf-token", token)
      .send({ priority: "high" })
      .expect(200);

    const closed = await agent
      .post("/api/complaints/bulk-status")
      .set("x-csrf-token", token)
      .send({ ids: [firstId, secondId], status: "dismissed" })
      .expect(200);
    expect(closed.body.updated).toBe(2);

    const rows = await prisma.complaint.findMany({
      where: { id: { in: [firstId, secondId] } },
      orderBy: { id: "asc" },
      select: { status: true, priority: true, dueAt: true },
    });
    expect(rows).toEqual([
      { status: "dismissed", priority: "none", dueAt: null },
      { status: "dismissed", priority: "none", dueAt: null },
    ]);

    const hearing = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(hearing!.status).toBe("cancelled");

    const bulkReversed = await agent
      .post("/api/complaints/bulk-status")
      .set("x-csrf-token", token)
      .send({ ids: [firstId, secondId], status: "settled" })
      .expect(409);
    expect(bulkReversed.body.message).toContain("Can't move");

    await agent
      .post(`/api/complaints/${firstId}/reopen`)
      .set("x-csrf-token", token)
      .send({ reason: "Settlement was not honoured." })
      .expect(200);

    const reopened = await prisma.complaint.findUnique({
      where: { id: firstId },
      select: {
        status: true,
        priority: true,
        dueAt: true,
        updates: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    expect(reopened!.status).toBe("received");
    expect(reopened!.priority).toBe("normal");
    const hoursUntilDue =
      (reopened!.dueAt!.getTime() - Date.now()) / 3_600_000;
    expect(hoursUntilDue).toBeGreaterThan(23);
    expect(hoursUntilDue).toBeLessThan(25);
    expect(reopened!.updates[0]!.publicNote).toContain("Case Reopened");

    const reopenAgain = await agent
      .post(`/api/complaints/${firstId}/reopen`)
      .set("x-csrf-token", token)
      .send({ reason: "Duplicate request" })
      .expect(409);
    expect(reopenAgain.body.message).toBe("Only closed cases can be reopened.");
  });
});
