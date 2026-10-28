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
      reference: expect.stringMatching(/^BK-/),
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
    expect(events[0].hearingAt!.getTime()).toBe(slotIn(5).getTime());
    expect(events[0].internalNote).toContain("Mediation scheduled for");
    expect(events[1].hearingAt!.getTime()).toBe(slotIn(9).getTime());
    expect(events[1].internalNote).toContain("Mediation rescheduled from");
    expect(events[1].createdById).toBe(admin.id);
    expect(events[1].publicNote).toBeNull();
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
});
