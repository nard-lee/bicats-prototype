import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
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

describe("hearing attendance", () => {
  it("records per-party attendance, completes the session, and audits it", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");
    const hearingId = await schedule(
      agent,
      token,
      complaintId,
      new Date(Date.now() - DAY_MS),
    );

    const recorded = await agent
      .put(`/api/hearings/${hearingId}/attendance`)
      .set("x-csrf-token", token)
      .send({
        complainant: "present",
        respondent: "absent",
        notes: "Respondent did not appear.",
      })
      .expect(200);

    expect(recorded.body).toEqual({
      success: true,
      status: "completed",
      statusChanged: true,
    });

    const hearing = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(hearing).toMatchObject({
      complainantAttendance: "present",
      respondentAttendance: "absent",
      attendanceNotes: "Respondent did not appear.",
      status: "completed",
    });
    expect(hearing!.attendanceRecordedAt).toBeInstanceOf(Date);

    const list = await agent.get("/api/hearings").expect(200);
    expect(list.body.items[0]).toMatchObject({
      id: hearingId,
      complainantAttendance: "present",
      respondentAttendance: "absent",
      status: "completed",
    });

    await vi.waitFor(async () => {
      const entry = await prisma.auditLog.findFirst({
        where: { action: "hearing.attendance", entityId: hearingId },
      });
      expect(entry).not.toBeNull();
      expect(entry!.summary).toContain("complainant present");
      expect(entry!.summary).toContain("respondent absent");
    });
  });

  it("marks a session no show when neither party attended and corrects it on re-record", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");
    const hearingId = await schedule(
      agent,
      token,
      complaintId,
      new Date(Date.now() - DAY_MS),
    );

    const noShow = await agent
      .put(`/api/hearings/${hearingId}/attendance`)
      .set("x-csrf-token", token)
      .send({ complainant: "absent", respondent: "excused" })
      .expect(200);

    expect(noShow.body).toMatchObject({
      status: "no_show",
      statusChanged: true,
    });

    const corrected = await agent
      .put(`/api/hearings/${hearingId}/attendance`)
      .set("x-csrf-token", token)
      .send({ complainant: "present", respondent: "present" })
      .expect(200);

    expect(corrected.body).toMatchObject({
      status: "completed",
      statusChanged: true,
    });

    const hearing = await prisma.hearing.findUnique({ where: { id: hearingId } });
    expect(hearing).toMatchObject({
      complainantAttendance: "present",
      respondentAttendance: "present",
      status: "completed",
    });
  });

  it("rejects future, cancelled, invalid, and unauthorized attendance records", async () => {
    await createUser("admin");
    await createUser("secretary");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    const pastId = await schedule(
      agent,
      token,
      complaintId,
      new Date(Date.now() - DAY_MS),
    );
    const futureId = await schedule(
      agent,
      token,
      complaintId,
      new Date(Date.now() + 2 * DAY_MS),
    );

    const invalid = await agent
      .put(`/api/hearings/${pastId}/attendance`)
      .set("x-csrf-token", token)
      .send({ complainant: "maybe", respondent: "unknown" })
      .expect(400);
    expect(invalid.body.fields).toMatchObject({
      complainant: expect.any(String),
      respondent: expect.any(String),
    });

    const secretary = await loginAgent("secretary");
    await secretary.agent
      .put(`/api/hearings/${pastId}/attendance`)
      .set("x-csrf-token", secretary.token)
      .send({ complainant: "present", respondent: "present" })
      .expect(403);

    const tooEarly = await agent
      .put(`/api/hearings/${futureId}/attendance`)
      .set("x-csrf-token", token)
      .send({ complainant: "present", respondent: "present" })
      .expect(409);
    expect(tooEarly.body.message).toContain("scheduled time");

    await agent
      .delete(`/api/hearings/${futureId}`)
      .set("x-csrf-token", token)
      .expect(200);

    const cancelled = await agent
      .put(`/api/hearings/${futureId}/attendance`)
      .set("x-csrf-token", token)
      .send({ complainant: "present", respondent: "present" })
      .expect(409);
    expect(cancelled.body.message).toContain("cancelled");

    expect(
      await prisma.hearing.count({
        where: {
          id: { in: [pastId, futureId] },
          attendanceRecordedAt: { not: null },
        },
      }),
    ).toBe(0);
  });
});
