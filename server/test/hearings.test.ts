import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import { createUser, csrfToken, loginAgent, submitComplaint } from "./helpers.js";

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
});
