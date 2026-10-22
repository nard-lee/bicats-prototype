import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import {
  createUser,
  csrfToken,
  loginAgent,
  submitComplaint,
} from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function filedComplaint() {
  const agent = request.agent(app);
  const token = await csrfToken(agent);
  const filed = await submitComplaint(agent, token).expect(200);

  return prisma.complaint.findUnique({
    where: { reference: filed.body.reference as string },
  });
}

describe("proof of service", () => {
  it("records a received summons and restarts the mediation deadline", async () => {
    const admin = await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);

    const servedAt = new Date(Date.now() - 2 * DAY_MS);

    const recorded = await agent
      .post(`/api/complaints/${complaint!.id}/service-records`)
      .set("x-csrf-token", token)
      .send({
        servedAt: servedAt.toISOString(),
        serverName: "Bgy. Tanod Cruz",
        result: "received",
        notes: "Received by the respondent personally.",
      })
      .expect(201);

    expect(recorded.body.deadlineUpdated).toBe(true);

    const record = await prisma.serviceRecord.findFirst({
      where: { complaintId: complaint!.id },
    });
    expect(record).toMatchObject({
      serverName: "Bgy. Tanod Cruz",
      result: "received",
      notes: "Received by the respondent personally.",
      createdById: admin.id,
    });

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.status).toBe("summoned");
    expect(updated!.dueAt!.getTime()).toBe(servedAt.getTime() + 15 * DAY_MS);

    const detail = await agent
      .get(`/api/complaints/${complaint!.id}`)
      .expect(200);
    expect(detail.body.serviceRecords[0]).toMatchObject({
      serverName: "Bgy. Tanod Cruz",
      result: "received",
      createdBy: "admin account",
    });

    const event = detail.body.history.find(
      (item: { kind: string }) => item.kind === "service",
    );
    expect(event).toMatchObject({
      serverName: "Bgy. Tanod Cruz",
      serviceResult: "received",
    });
    expect(event.note).toContain("Summons received");
    expect(event.note).toContain("respondent personally");

    await vi.waitFor(async () => {
      const audit = await prisma.auditLog.findFirst({
        where: { action: "complaint.service.record" },
      });
      expect(audit).not.toBeNull();
      expect(audit!.summary).toContain(complaint!.reference);
      expect(audit!.meta).toMatchObject({ result: "received", deadlineUpdated: true });
    });
  });

  it("rejects invalid proof-of-service input", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");

    const response = await agent
      .post(`/api/complaints/${complaint!.id}/service-records`)
      .set("x-csrf-token", token)
      .send({
        servedAt: new Date(Date.now() + DAY_MS).toISOString(),
        serverName: "",
        result: "maybe",
      })
      .expect(400);

    expect(response.body.message).toBe("Validation failed");
    expect(response.body.fields).toMatchObject({
      servedAt: expect.any(String),
      serverName: expect.any(String),
      result: expect.any(String),
    });

    expect(
      await prisma.serviceRecord.count({ where: { complaintId: complaint!.id } }),
    ).toBe(0);
  });

  it("keeps refused and not-found attempts from moving the deadline", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);

    const before = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });

    const refused = await agent
      .post(`/api/complaints/${complaint!.id}/service-records`)
      .set("x-csrf-token", token)
      .send({
        servedAt: new Date().toISOString(),
        serverName: "Bgy. Tanod Reyes",
        result: "refused",
        notes: "The respondent refused to receive the summons.",
      })
      .expect(201);
    expect(refused.body.deadlineUpdated).toBe(false);

    const notFound = await agent
      .post(`/api/complaints/${complaint!.id}/service-records`)
      .set("x-csrf-token", token)
      .send({
        servedAt: new Date().toISOString(),
        serverName: "Bgy. Tanod Reyes",
        result: "not_found",
      })
      .expect(201);
    expect(notFound.body.deadlineUpdated).toBe(false);

    const after = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(after!.dueAt!.getTime()).toBe(before!.dueAt!.getTime());
    expect(
      await prisma.serviceRecord.count({ where: { complaintId: complaint!.id } }),
    ).toBe(2);
  });

  it("blocks proof of service for read-only roles and closed cases", async () => {
    await createUser("secretary");
    await createUser("admin");
    const complaint = await filedComplaint();

    const secretary = await loginAgent("secretary");
    const denied = await secretary.agent
      .post(`/api/complaints/${complaint!.id}/service-records`)
      .set("x-csrf-token", secretary.token)
      .send({
        servedAt: new Date().toISOString(),
        serverName: "Bgy. Tanod Cruz",
        result: "received",
      })
      .expect(403);
    expect(denied.body).toEqual({ message: "Insufficient permissions" });

    const admin = await loginAgent("admin");
    await admin.agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", admin.token)
      .send({ status: "dismissed" })
      .expect(200);

    const closed = await admin.agent
      .post(`/api/complaints/${complaint!.id}/service-records`)
      .set("x-csrf-token", admin.token)
      .send({
        servedAt: new Date().toISOString(),
        serverName: "Bgy. Tanod Cruz",
        result: "received",
      })
      .expect(409);
    expect(closed.body.message).toContain("case is closed");
  });
});
