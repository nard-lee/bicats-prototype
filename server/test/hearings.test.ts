import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import emailService from "../src/modules/email/email.service.js";
import complainantNotifier from "../src/modules/notify/complainant.notifier.js";
import smsService from "../src/modules/sms/sms.service.js";
import { createUser, csrfToken, loginAgent, submitComplaint } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function filedComplaintId(): Promise<number> {
  const agent = request.agent(app);
  const token = await csrfToken(agent);
  const filed = await submitComplaint(agent, token).expect(200);

  const complaint = await prisma.complaint.findUnique({
    where: { reference: filed.body.reference as string },
    select: { id: true },
  });

  return complaint!.id;
}

// Hearings.test.ts is at the public intake cap, so build cases straight in the
// database when a test only needs a complaint to hang a session off.
async function directComplaint(status: "mediation" | "settled"): Promise<number> {
  const complaint = await prisma.complaint.create({
    data: {
      reference: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      complainantName: "Juan Dela Cruz",
      complainantAge: 34,
      complainantPurok: "Session Road",
      complainantContact: "0917 123 4567",
      contactNormalized: "09171234567",
      complainantAddress: "12 Mabini Street",
      respondentName: "Pedro Reyes",
      respondentAddress: "Purok 3",
      relationship: "Neighbor",
      complaintType: "type1",
      incidentAt: new Date(Date.now() - DAY_MS),
      incidentPlace: "Purok 2 covered court",
      narrative: "Loud videoke until past midnight.",
      status,
      consentAt: new Date(),
    },
    select: { id: true },
  });

  return complaint.id;
}

// 10:00 Philippine time, so the slot is valid with or without office-hours
// enforcement.
function slotIn(days: number): Date {
  const date = new Date(Date.now() + days * DAY_MS);
  date.setUTCHours(2, 0, 0, 0);
  return date;
}

describe("mediation management", () => {
  it("cancels a scheduled mediation, audits it, and keeps the case on record", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");
    const scheduledAt = new Date(Date.now() + 5 * 86_400_000);

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: scheduledAt.toISOString(),
        kind: "mediation",
        location: "Barangay Session Hall",
      })
      .expect(201);

    expect(created.body).toMatchObject({
      success: true,
      reference: expect.stringMatching(/^\d{2}-\d{2}-\d{4}$/),
    });
    const hearingId = created.body.id as number;

    await agent
      .delete(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .expect(200);

    const hearing = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(hearing!.status).toBe("cancelled");
    expect(hearing!.complaintId).toBe(complaintId);

    await vi.waitFor(async () => {
      const entry = await prisma.auditLog.findFirst({
        where: { action: "hearing.cancel", entityId: hearingId },
      });
      expect(entry).not.toBeNull();
      expect(entry!.summary).toContain(created.body.reference as string);
    });
  });

  it("returns 404 for cancelling or updating a mediation that does not exist", async () => {
    await createUser("admin");
    const { agent, token } = await loginAgent("admin");
    const missingId = 999_999;

    const cancelled = await agent
      .delete(`/api/hearings/${missingId}`)
      .set("x-csrf-token", token)
      .expect(404);
    expect(cancelled.body).toEqual({ message: "Mediation not found" });

    const updated = await agent
      .patch(`/api/hearings/${missingId}`)
      .set("x-csrf-token", token)
      .send({ status: "completed" })
      .expect(404);
    expect(updated.body).toEqual({ message: "Mediation not found" });

    const invalid = await agent
      .delete("/api/hearings/not-a-number")
      .set("x-csrf-token", token)
      .expect(400);
    expect(invalid.body).toEqual({ message: "Invalid mediation ID" });

    expect(await prisma.hearing.count()).toBe(0);
  });

  it("keeps the venue in the reschedule notice when only the date moves", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(5).toISOString(),
        kind: "mediation",
        location: "Barangay Session Hall",
      })
      .expect(201);

    expect(created.body.location).toBe("Barangay Session Hall");
    const hearingId = created.body.id as number;

    const notices = vi
      .spyOn(complainantNotifier, "mediationScheduled")
      .mockResolvedValue(undefined);

    await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ scheduledAt: slotIn(9).toISOString() })
      .expect(200);

    await vi.waitFor(() => {
      expect(notices).toHaveBeenCalledWith(
        complaintId,
        expect.objectContaining({
          location: "Barangay Session Hall",
          rescheduled: true,
        }),
      );
    });
    notices.mockRestore();

    const saved = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(saved!.location).toBe("Barangay Session Hall");
    expect(saved!.scheduledAt.getTime()).toBe(slotIn(9).getTime());
  });

  it("puts the session schedule and any reschedule on the case timeline", async () => {
    const admin = await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(5).toISOString(),
        kind: "mediation",
      })
      .expect(201);

    await agent
      .patch(`/api/hearings/${created.body.id as number}`)
      .set("x-csrf-token", token)
      .send({ scheduledAt: slotIn(9).toISOString() })
      .expect(200);

    const events = await prisma.statusUpdate.findMany({
      where: { complaintId, hearingAt: { not: null } },
      orderBy: { id: "asc" },
    });

    expect(events).toHaveLength(2);
    expect(events[0]!.hearingAt!.getTime()).toBe(slotIn(5).getTime());
    expect(events[0]!.internalNote).toContain("Mediation scheduled for");
    expect(events[1]!.hearingAt!.getTime()).toBe(slotIn(9).getTime());
    expect(events[1]!.internalNote).toContain("Mediation rescheduled from");
    expect(events[1]!.createdById).toBe(admin.id);
    expect(events[1]!.publicNote).toBeNull();
  });

  it("clears a blank venue to null instead of storing an empty string", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(4).toISOString(),
        kind: "mediation",
        location: "Barangay Session Hall",
      })
      .expect(201);

    await agent
      .patch(`/api/hearings/${created.body.id as number}`)
      .set("x-csrf-token", token)
      .send({ location: "", notes: "   " })
      .expect(200);

    const saved = await prisma.hearing.findUnique({
      where: { id: created.body.id as number },
    });
    expect(saved!.location).toBeNull();
    expect(saved!.notes).toBeNull();
  });

  it("re-checks the slot when a cancelled session is reopened", async () => {
    await createUser("admin");
    const firstId = await filedComplaintId();
    const secondId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    const cancelled = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId: secondId,
        scheduledAt: slotIn(6).toISOString(),
        kind: "mediation",
      })
      .expect(201);

    await agent
      .delete(`/api/hearings/${cancelled.body.id as number}`)
      .set("x-csrf-token", token)
      .expect(200);

    // A cancelled session frees its slot, so another case can take it.
    await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId: firstId,
        scheduledAt: slotIn(6).toISOString(),
        kind: "mediation",
      })
      .expect(201);

    const clash = await agent
      .patch(`/api/hearings/${cancelled.body.id as number}`)
      .set("x-csrf-token", token)
      .send({ status: "scheduled" })
      .expect(409);
    expect(clash.body.message).toContain("already scheduled at that time");

    const stillCancelled = await prisma.hearing.findUnique({
      where: { id: cancelled.body.id as number },
    });
    expect(stillCancelled!.status).toBe("cancelled");
  });

  it("notifies cancellation once, from either the edit dialog or delete", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(3).toISOString(),
        kind: "conciliation",
      })
      .expect(201);
    const hearingId = created.body.id as number;

    const cancellations = vi
      .spyOn(complainantNotifier, "mediationCancelled")
      .mockResolvedValue(undefined);

    // Cancelling through the edit dialog (PATCH status=cancelled).
    await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ status: "cancelled" })
      .expect(200);

    await vi.waitFor(() => {
      expect(cancellations).toHaveBeenCalledTimes(1);
    });

    // A repeat of the same decision stays silent.
    await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ status: "cancelled" })
      .expect(200);
    await agent
      .delete(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(cancellations).toHaveBeenCalledTimes(1);
    cancellations.mockRestore();
  });

  it("sends the cancellation through both SMS and email", async () => {
    await createUser("admin");
    const filer = request.agent(app);
    const filerToken = await csrfToken(filer);
    const filed = await submitComplaint(filer, filerToken, {
      complainantEmail: "filer@bicats.test",
    }).expect(200);
    const complaint = await prisma.complaint.findUniqueOrThrow({
      where: { reference: filed.body.reference as string },
      select: { id: true },
    });
    const { agent, token } = await loginAgent("admin");

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId: complaint.id,
        scheduledAt: slotIn(5).toISOString(),
        kind: "mediation",
        location: "Barangay Session Hall",
      })
      .expect(201);

    // The suite blanks the provider keys, so stand in a working provider and
    // capture exactly what the notifier hands it.
    vi.spyOn(smsService, "isSmsEnabled").mockReturnValue(true);
    vi.spyOn(emailService, "isEmailEnabled").mockReturnValue(true);
    const sms = vi.spyOn(smsService, "send").mockResolvedValue(true);
    const email = vi.spyOn(emailService, "send").mockResolvedValue(true);

    await agent
      .delete(`/api/hearings/${created.body.id as number}`)
      .set("x-csrf-token", token)
      .expect(200);

    await vi.waitFor(() => {
      expect(sms).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "09171234567",
          content: expect.stringContaining("has been cancelled"),
        }),
      );
      expect(email).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "filer@bicats.test",
          subject: expect.stringContaining("was cancelled"),
        }),
      );
    });

    vi.restoreAllMocks();
  });

  it("tells the complainant when a cancelled session is put back on", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");
    const scheduled = vi
      .spyOn(complainantNotifier, "mediationScheduled")
      .mockResolvedValue(undefined);

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(6).toISOString(),
        kind: "mediation",
        location: "Barangay Session Hall",
      })
      .expect(201);
    const hearingId = created.body.id as number;

    await agent
      .delete(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .expect(200);

    // Reopening without moving the date used to be silent.
    await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ status: "scheduled" })
      .expect(200);

    await vi.waitFor(() => {
      expect(scheduled).toHaveBeenCalledTimes(2);
    });
    expect(scheduled).toHaveBeenLastCalledWith(
      complaintId,
      expect.objectContaining({
        location: "Barangay Session Hall",
        scheduledAt: slotIn(6),
        rescheduled: false,
      }),
    );
    vi.restoreAllMocks();
  });

  it("tells the complainant when closing the case cancels the session", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(8).toISOString(),
        kind: "conciliation",
      })
      .expect(201);

    const cancellations = vi
      .spyOn(complainantNotifier, "mediationCancelled")
      .mockResolvedValue(undefined);

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "dismissed" })
      .expect(200);

    await vi.waitFor(() => {
      expect(cancellations).toHaveBeenCalledTimes(1);
    });
    expect(cancellations).toHaveBeenCalledWith(complaintId, {
      kind: "conciliation",
    });

    const hearing = await prisma.hearing.findUnique({
      where: { id: created.body.id as number },
    });
    expect(hearing!.status).toBe("cancelled");
    vi.restoreAllMocks();
  });

  it("accepts a past date only when the session is booked as already held", async () => {
    await createUser("admin");
    const complaintId = await directComplaint("mediation");
    const { agent, token } = await loginAgent("admin");

    // Booking notices are mocked so the test can count them; the file is at
    // the public intake cap, so the case is built straight in the database.
    const booked = vi
      .spyOn(complainantNotifier, "mediationScheduled")
      .mockResolvedValue(undefined);

    // A live booking can't open behind today.
    const rejected = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(-2).toISOString(),
        kind: "mediation",
      })
      .expect(400);
    expect(rejected.body.message).toContain("already passed");
    expect(rejected.body.message).toContain("completed or no show");
    expect(rejected.body.fields).toHaveProperty("scheduledAt");

    // A session that took place without a prior booking is a record.
    const recorded = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(-2).toISOString(),
        kind: "conciliation",
        status: "no_show",
        outcome: "Neither party appeared.",
      })
      .expect(201);
    expect(recorded.body).toMatchObject({ success: true, status: "no_show" });

    const hearingId = recorded.body.id as number;
    const hearing = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(hearing).toMatchObject({
      status: "no_show",
      outcome: "Neither party appeared.",
      attendanceRecordedAt: null,
    });
    expect(hearing!.scheduledAt.getTime()).toBe(slotIn(-2).getTime());

    // The case timeline says it was held, and nobody is told a session was
    // booked for a date already over.
    const note = await prisma.statusUpdate.findFirst({
      where: { complaintId },
      orderBy: { id: "desc" },
    });
    expect(note!.internalNote).toContain("held on");
    expect(note!.internalNote).toContain("no show");

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(booked).not.toHaveBeenCalled();

    await vi.waitFor(async () => {
      const entry = await prisma.auditLog.findFirst({
        where: { action: "hearing.create", entityId: hearingId },
      });
      expect(entry!.summary).toContain("Recorded a conciliation session held for");
    });

    // A session that has not happened yet can only be scheduled.
    const tooEarly = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(4).toISOString(),
        status: "completed",
      })
      .expect(400);
    expect(tooEarly.body.message).toContain("hasn't been held");
    expect(tooEarly.body.fields).toHaveProperty("status");

    // A future booking still announces itself.
    const scheduled = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(6).toISOString(),
        kind: "mediation",
      })
      .expect(201);
    expect(scheduled.body).toMatchObject({ status: "scheduled" });

    await vi.waitFor(() => {
      expect(booked).toHaveBeenCalledTimes(1);
    });

    expect(await prisma.hearing.count()).toBe(2);
    booked.mockRestore();
  });

  it("refuses to move a scheduled session into the past", async () => {
    await createUser("admin");
    const complaintId = await directComplaint("mediation");
    const { agent, token } = await loginAgent("admin");

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(5).toISOString(),
        kind: "mediation",
      })
      .expect(201);
    const hearingId = created.body.id as number;

    const rejected = await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ scheduledAt: slotIn(-2).toISOString() })
      .expect(400);
    expect(rejected.body.message).toContain("already passed");
    expect(rejected.body.fields).toHaveProperty("scheduledAt");

    const unchanged = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(unchanged!.scheduledAt.getTime()).toBe(slotIn(5).getTime());

    await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ scheduledAt: slotIn(9).toISOString() })
      .expect(200);

    // A cancelled session with a stale date can't be put back on the calendar.
    const stale = await prisma.hearing.create({
      data: {
        complaintId,
        scheduledAt: slotIn(-4),
        kind: "conciliation",
        status: "cancelled",
      },
    });

    const revived = await agent
      .patch(`/api/hearings/${stale.id}`)
      .set("x-csrf-token", token)
      .send({ status: "scheduled" })
      .expect(400);
    expect(revived.body.message).toContain("already passed");

    // A session that is already overdue keeps its notes editable.
    await prisma.hearing.update({
      where: { id: hearingId },
      data: { scheduledAt: slotIn(-3) },
    });

    await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ notes: "Followed up at the barangay hall." })
      .expect(200);

    // Correcting the record of a session that took place can move its date
    // inside the past, as long as it stops being a booking.
    await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ scheduledAt: slotIn(-1).toISOString(), status: "completed" })
      .expect(200);

    const recorded = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(recorded).toMatchObject({
      status: "completed",
      notes: "Followed up at the barangay hall.",
    });
    expect(recorded!.scheduledAt.getTime()).toBe(slotIn(-1).getTime());
  });

  it("refuses to reschedule a session that already happened or was called off", async () => {
    await createUser("admin");
    const complaintId = await directComplaint("mediation");
    const { agent, token } = await loginAgent("admin");

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(5).toISOString(),
        kind: "mediation",
      })
      .expect(201);
    const hearingId = created.body.id as number;

    await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ status: "completed" })
      .expect(200);

    const moved = await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ scheduledAt: slotIn(8).toISOString() })
      .expect(409);
    expect(moved.body.message).toContain("finished session");

    const retyped = await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ kind: "conciliation" })
      .expect(409);
    expect(retyped.body.message).toContain("finished session");

    // Venue and outcome are part of the record too.
    for (const patch of [
      { location: "Barangay Conference Room" },
      { outcome: "Parties agreed on a different settlement." },
    ]) {
      const locked = await agent
        .patch(`/api/hearings/${hearingId}`)
        .set("x-csrf-token", token)
        .send(patch)
        .expect(409);
      expect(locked.body.message).toContain("Only notes can be added");
    }

    const cancelledDone = await agent
      .delete(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .expect(409);
    expect(cancelledDone.body.message).toContain("Only a scheduled session");

    // Correcting the written record stays allowed.
    await agent
      .patch(`/api/hearings/${hearingId}`)
      .set("x-csrf-token", token)
      .send({ notes: "Session moved indoors due to rain." })
      .expect(200);

    const saved = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(saved!.status).toBe("completed");
    expect(saved!.scheduledAt.getTime()).toBe(slotIn(5).getTime());
    expect(saved!.notes).toBe("Session moved indoors due to rain.");

    // A cancelled session is finished too, even though it never happened.
    const second = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: slotIn(6).toISOString(),
        kind: "mediation",
      })
      .expect(201);

    await agent
      .delete(`/api/hearings/${second.body.id as number}`)
      .set("x-csrf-token", token)
      .expect(200);

    const revive = await agent
      .patch(`/api/hearings/${second.body.id as number}`)
      .set("x-csrf-token", token)
      .send({ scheduledAt: slotIn(10).toISOString() })
      .expect(409);
    expect(revive.body.message).toContain("finished session");
  });

  it("keeps the schedule of sessions on a closed case frozen", async () => {
    await createUser("admin");
    const complaintId = await directComplaint("settled");
    const { agent, token } = await loginAgent("admin");

    // Closing the case normally cancels its sessions, so seed the rows the
    // guard has to defend against anyway.
    const scheduled = await prisma.hearing.create({
      data: {
        complaintId,
        scheduledAt: slotIn(5),
        kind: "mediation",
      },
    });
    const cancelled = await prisma.hearing.create({
      data: {
        complaintId,
        scheduledAt: slotIn(6),
        kind: "conciliation",
        status: "cancelled",
      },
    });

    const moved = await agent
      .patch(`/api/hearings/${scheduled.id}`)
      .set("x-csrf-token", token)
      .send({ scheduledAt: slotIn(9).toISOString() })
      .expect(409);
    expect(moved.body.message).toContain("case is closed");

    const reopened = await agent
      .patch(`/api/hearings/${cancelled.id}`)
      .set("x-csrf-token", token)
      .send({ status: "scheduled" })
      .expect(409);
    expect(reopened.body.message).toContain("case is closed");

    const relabeled = await agent
      .patch(`/api/hearings/${scheduled.id}`)
      .set("x-csrf-token", token)
      .send({ location: "Barangay Conference Room" })
      .expect(409);
    expect(relabeled.body.message).toContain("Only notes can be added");

    const rows = await prisma.hearing.findMany({
      where: { id: { in: [scheduled.id, cancelled.id] } },
      orderBy: { id: "asc" },
    });
    expect(rows.map((row) => row.status)).toEqual(["scheduled", "cancelled"]);
    expect(rows[0]!.scheduledAt.getTime()).toBe(slotIn(5).getTime());
  });
});
