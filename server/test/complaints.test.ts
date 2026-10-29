import fs from "node:fs";
import path from "node:path";

import request from "supertest";
import { afterAll, describe, expect, it, vi } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import {
  UPLOADS_DIR,
  createUser,
  csrfToken,
  loginAgent,
  submitComplaint,
} from "./helpers.js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const uploadsBefore = new Set(fs.readdirSync(UPLOADS_DIR));

afterAll(() => {
  for (const name of fs.readdirSync(UPLOADS_DIR)) {
    if (!uploadsBefore.has(name)) {
      fs.rmSync(path.join(UPLOADS_DIR, name), { force: true });
    }
  }
});

describe("complaint intake", () => {
  it("files complaints with sequential monthly references and the first deadline", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);
    const now = new Date();
    const period = `${String(now.getFullYear()).slice(-2)}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const first = await submitComplaint(agent, token).expect(200);
    const second = await submitComplaint(agent, token, {
      complaintType: "type2",
    }).expect(200);

    expect(first.body).toEqual({
      reference: `${period}-0001`,
      success: true,
    });
    expect(second.body.reference).toBe(`${period}-0002`);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: first.body.reference as string },
      include: { updates: true },
    });

    expect(complaint).not.toBeNull();
    expect(complaint!.status).toBe("received");
    expect(complaint!.contactNormalized).toBe("09171234567");
    expect(complaint!.updates).toHaveLength(1);
    expect(complaint!.updates[0]!.status).toBe("received");

    const hoursUntilDue =
      (complaint!.dueAt!.getTime() - Date.now()) / 3_600_000;
    expect(hoursUntilDue).toBeGreaterThan(23);
    expect(hoursUntilDue).toBeLessThan(25);

    const counter = await prisma.referenceCounter.findUnique({ where: { period } });
    expect(counter?.lastValue).toBe(2);
  });

  it("returns field errors and stores nothing for invalid input", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const response = await submitComplaint(agent, token, {
      complainantContact: "123",
      consent: "off",
    }).expect(400);

    expect(response.body.message).toBe("Validation failed");
    expect(response.body.fields).toMatchObject({
      complainantContact: expect.any(String),
      consent: expect.any(String),
    });
    expect(await prisma.complaint.count()).toBe(0);
  });

  it("stores evidence files and their metadata", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    await submitComplaint(agent, token)
      .attach("evidence", PNG, {
        filename: "photo.png",
        contentType: "image/png",
      })
      .expect(200);

    const evidence = await prisma.evidence.findFirst();
    expect(evidence).not.toBeNull();
    expect(evidence!.originalName).toBe("photo.png");
    expect(evidence!.mimeType).toBe("image/png");
    expect(evidence!.size).toBe(PNG.length);
    expect(fs.existsSync(path.join(UPLOADS_DIR, evidence!.storedName))).toBe(true);
  });

  it("rejects unsupported evidence types", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const response = await submitComplaint(agent, token)
      .attach("evidence", Buffer.from("notes"), {
        filename: "notes.txt",
        contentType: "text/plain",
      })
      .expect(400);

    expect(response.body.message).toBe(
      "Unsupported file type. Allowed: JPG, PNG, PDF, MP4.",
    );
    expect(await prisma.complaint.count()).toBe(0);
  });

  it("tracks a complaint with the matching contact number only", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const filed = await submitComplaint(agent, token).expect(200);
    const reference = filed.body.reference as string;

    const tracked = await agent
      .post("/api/complaints/track")
      .set("x-csrf-token", token)
      .send({
        reference: reference.toLowerCase(),
        phone: "+63 917 123 4567",
      })
      .expect(200);

    expect(tracked.body).toMatchObject({
      reference,
      status: "received",
    });
    expect(tracked.body.updates).toHaveLength(1);

    const wrongPhone = await agent
      .post("/api/complaints/track")
      .set("x-csrf-token", token)
      .send({ reference, phone: "0917 000 0000" })
      .expect(404);

    expect(wrongPhone.body).toEqual({ message: "No matching complaint found" });

    const invalid = await agent
      .post("/api/complaints/track")
      .set("x-csrf-token", token)
      .send({ phone: "0917 123 4567" })
      .expect(400);

    expect(invalid.body.message).toBe("Validation failed");
    expect(invalid.body.fields).toMatchObject({
      reference: expect.any(String),
    });
  });
});

describe("staff case workflow", () => {
  it("advances a case, schedules mediation, audits it, and updates the dashboard", async () => {
    const admin = await createUser("admin");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);
    const filed = await submitComplaint(publicAgent, publicToken).expect(200);
    const reference = filed.body.reference as string;

    const complaint = await prisma.complaint.findUnique({
      where: { reference },
    });
    expect(complaint).not.toBeNull();
    const complaintId = complaint!.id;

    const { agent, token } = await loginAgent("admin");
    const hearingAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({
        status: "summoned",
        publicNote: "Summons issued.",
      })
      .expect(200);

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({
        status: "mediation",
        publicNote: "First mediation scheduled.",
        hearingAt: hearingAt.toISOString(),
      })
      .expect(200);

    const updated = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        hearings: true,
        updates: { orderBy: { createdAt: "asc" } },
      },
    });

    expect(updated!.status).toBe("mediation");
    expect(updated!.updates).toHaveLength(3);
    expect(updated!.updates[2]!.status).toBe("mediation");
    expect(updated!.updates[2]!.createdById).toBe(admin.id);
    expect(updated!.hearings).toHaveLength(1);
    expect(updated!.hearings[0]!.kind).toBe("mediation");
    expect(updated!.hearings[0]!.status).toBe("scheduled");

    const daysUntilDue =
      (updated!.dueAt!.getTime() - Date.now()) / 86_400_000;
    expect(daysUntilDue).toBeGreaterThan(14.5);
    expect(daysUntilDue).toBeLessThan(15.5);

    await vi.waitFor(async () => {
      const entry = await prisma.auditLog.findFirst({
        where: { action: "complaint.status.update" },
      });
      expect(entry).not.toBeNull();
      expect(entry!.summary).toContain(reference);
    });

    const tracked = await publicAgent
      .post("/api/complaints/track")
      .set("x-csrf-token", publicToken)
      .send({ reference, phone: "09171234567" })
      .expect(200);

    expect(tracked.body.status).toBe("mediation");
    expect(tracked.body.updates).toHaveLength(3);
    expect(tracked.body.updates[2].hearingAt).toBe(hearingAt.toISOString());

    const detail = await agent
      .get(`/api/complaints/${complaintId}`)
      .expect(200);
    expect(detail.body.status).toBe("mediation");
    expect(detail.body.history).toHaveLength(3);
    expect(detail.body.nextHearingAt).toBe(hearingAt.toISOString());

    await agent
      .post(`/api/complaints/${complaintId}/view`)
      .set("x-csrf-token", token)
      .expect(200);

    const viewed = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { viewedAt: true },
    });
    expect(viewed!.viewedAt).not.toBeNull();

    const filtered = await agent
      .post("/api/complaints/list?status=mediation")
      .set("x-csrf-token", token)
      .expect(200);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.items[0].reference).toBe(reference);

    const invalidId = await agent
      .get("/api/complaints/not-a-number")
      .expect(400);
    expect(invalidId.body).toEqual({ message: "Invalid complaint ID" });

    const missing = await agent.get("/api/complaints/999999").expect(404);
    expect(missing.body).toEqual({ message: "Complaint not found" });

    await prisma.complaint.update({
      where: { id: complaintId },
      data: { dueAt: new Date(Date.now() - 2 * 86_400_000) },
    });

    const overdue = await agent
      .post("/api/complaints/list?overdue=1")
      .set("x-csrf-token", token)
      .expect(200);
    expect(overdue.body.total).toBe(1);

    const stats = await agent.get("/api/analytics/stats").expect(200);
    expect(stats.body).toEqual({
      total: 1,
      open: 1,
      overdue: 1,
      dueSoon: 0,
      settled: 0,
    });
  });

  it("filters the register by search, type, and risk", async () => {
    await createUser("admin");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);

    const soon = await submitComplaint(publicAgent, publicToken, {
      complainantName: "Maria Santos",
    }).expect(200);
    const overdue = await submitComplaint(publicAgent, publicToken, {
      complainantName: "Josefa Ramos",
      complaintType: "type2",
    }).expect(200);

    const rows = await prisma.complaint.findMany({
      where: {
        reference: { in: [soon.body.reference, overdue.body.reference] },
      },
      select: { id: true, reference: true },
    });
    const idOf = (reference: string) =>
      rows.find((row) => row.reference === reference)!.id;

    await prisma.complaint.update({
      where: { id: idOf(soon.body.reference) },
      data: { dueAt: new Date(Date.now() + 2 * 86_400_000) },
    });
    await prisma.complaint.update({
      where: { id: idOf(overdue.body.reference) },
      data: { dueAt: new Date(Date.now() - 2 * 86_400_000) },
    });

    const { agent, token } = await loginAgent("admin");

    const list = (query: string) =>
      agent
        .post(`/api/complaints/list${query}`)
        .set("x-csrf-token", token)
        .expect(200);

    const search = await list("?q=maria");
    expect(
      search.body.items.map((item: { reference: string }) => item.reference),
    ).toEqual([soon.body.reference]);

    const byType = await list("?type=type2");
    expect(
      byType.body.items.map((item: { reference: string }) => item.reference),
    ).toEqual([overdue.body.reference]);

    const open = await list("?open=1");
    expect(open.body.total).toBe(2);

    const pastDue = await list("?overdue=1");
    expect(
      pastDue.body.items.map((item: { reference: string }) => item.reference),
    ).toEqual([overdue.body.reference]);

    const dueSoon = await list("?dueSoon=1");
    expect(
      dueSoon.body.items.map((item: { reference: string }) => item.reference),
    ).toEqual([soon.body.reference]);
  });

  it("allows read-only roles to view cases but not change them", async () => {
    await createUser("secretary");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);
    const filed = await submitComplaint(publicAgent, publicToken).expect(200);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: filed.body.reference as string },
    });

    const { agent, token } = await loginAgent("secretary");

    await agent
      .post("/api/complaints/list")
      .set("x-csrf-token", token)
      .expect(200);
    await agent.get("/api/analytics/stats").expect(200);

    const denied = await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "settled" })
      .expect(403);

    expect(denied.body).toEqual({ message: "Insufficient permissions" });

    const adminOnly = await agent.get("/api/users").expect(403);
    expect(adminOnly.body).toEqual({ message: "Insufficient permissions" });

    const unchanged = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
      select: { status: true },
    });
    expect(unchanged!.status).toBe("received");
  });
});
