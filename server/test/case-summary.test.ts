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

const INTERNAL_NOTE = "Respondent works night shifts. Call after 6pm only.";

async function filedCase(): Promise<{ id: number; reference: string }> {
  const agent = request.agent(app);
  const token = await csrfToken(agent);
  const filed = await submitComplaint(agent, token).expect(200);
  const reference = filed.body.reference as string;

  const complaint = await prisma.complaint.findUniqueOrThrow({
    where: { reference },
    select: { id: true },
  });

  return { id: complaint.id, reference };
}

describe("case summary report", () => {
  it("is open to every role that can view a case", async () => {
    const complaint = await filedCase();

    for (const role of ["admin", "staff", "secretary", "lupon"] as const) {
      await createUser(role);
      const { agent, token } = await loginAgent(role);

      const response = await agent
        .post(`/api/complaints/${complaint.id}/summary-report`)
        .set("x-csrf-token", token)
        .expect(200);

      expect(response.body.reference).toBe(complaint.reference);
    }
  });

  it("rejects an anonymous request", async () => {
    const complaint = await filedCase();

    // A CSRF token is needed to reach the auth check at all.
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    await agent
      .post(`/api/complaints/${complaint.id}/summary-report`)
      .set("x-csrf-token", token)
      .expect(401);
  });

  it("audits the export with the staff member who asked for it", async () => {
    const complaint = await filedCase();
    await createUser("secretary");
    const { agent, token } = await loginAgent("secretary");

    await agent
      .post(`/api/complaints/${complaint.id}/summary-report`)
      .set("x-csrf-token", token)
      .expect(200);

    // The audit write is deliberately fire-and-forget after the response.
    await vi.waitFor(async () => {
      const entry = await prisma.auditLog.findFirst({
        where: { action: "complaint.summary.generate" },
      });
      expect(entry).toMatchObject({
        entityType: "complaint",
        entityId: complaint.id,
        actorRole: "secretary",
        actorName: "secretary account",
      });
    });
  });

  it("carries every proceeding and keeps the two note kinds apart", async () => {
    const complaint = await filedCase();

    await prisma.hearing.create({
      data: {
        complaintId: complaint.id,
        scheduledAt: new Date("2026-01-05T09:00:00.000Z"),
        kind: "conciliation",
        status: "completed",
        location: "Barangay Hall",
        outcome: "No settlement reached.",
        complainantAttendance: "present",
        respondentAttendance: "absent",
      },
    });

    await createUser("lupon");
    const { agent, token } = await loginAgent("lupon");

    await agent
      .patch(`/api/complaints/${complaint.id}/status`)
      .set("x-csrf-token", token)
      .send({
        status: "summoned",
        publicNote: "The respondent has been summoned.",
        internalNote: INTERNAL_NOTE,
      })
      .expect(200);

    const response = await agent
      .post(`/api/complaints/${complaint.id}/summary-report`)
      .set("x-csrf-token", token)
      .expect(200);

    const summoned = response.body.history.find(
      (event: { status: string }) => event.status === "summoned",
    );
    expect(summoned).toMatchObject({
      publicNote: "The respondent has been summoned.",
      internalNote: INTERNAL_NOTE,
    });

    expect(response.body.hearings).toHaveLength(1);
    expect(response.body.hearings[0]).toMatchObject({
      kind: "conciliation",
      status: "completed",
      location: "Barangay Hall",
      outcome: "No settlement reached.",
      respondentAttendance: "absent",
    });
  });

  it("keeps internal notes out of the public tracking response", async () => {
    const complaint = await filedCase();
    await createUser("staff");
    const { agent, token } = await loginAgent("staff");

    await agent
      .patch(`/api/complaints/${complaint.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned", internalNote: INTERNAL_NOTE })
      .expect(200);

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);

    const tracked = await publicAgent
      .post("/api/complaints/track")
      .set("x-csrf-token", publicToken)
      .send({ reference: complaint.reference, phone: "0917 123 4567" })
      .expect(200);

    expect(JSON.stringify(tracked.body)).not.toContain(INTERNAL_NOTE);
    expect(JSON.stringify(tracked.body)).not.toContain("internalNote");
  });
});
