import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import { runReminderScan } from "../src/jobs/reminder.job.js";
import { computeNextDueAt } from "../src/modules/complaint/complaint.schema.js";
import { createUser, csrfToken, loginAgent, submitComplaint } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DEADLINE_DAYS = {
  received: 1,
  summoned: 15,
  mediation: 15,
  conciliation: 15,
};

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

async function settingsPayload(
  agent: ReturnType<typeof request.agent>,
): Promise<Record<string, unknown>> {
  const current = await agent.get("/api/settings").expect(200);
  const payload = { ...(current.body as Record<string, unknown>) };
  delete payload.id;
  delete payload.updatedAt;
  return payload;
}

async function updateSettings(
  agent: ReturnType<typeof request.agent>,
  token: string,
  overrides: Record<string, unknown>,
): Promise<void> {
  const payload = { ...(await settingsPayload(agent)), ...overrides };
  await agent
    .patch("/api/settings")
    .set("x-csrf-token", token)
    .send(payload)
    .expect(200);
}

describe("settings guardrails", () => {
  // The settings row survives the per-test truncation, so restore the defaults
  // this file changes before other test files run against them.
  afterAll(async () => {
    await prisma.barangaySettings.updateMany({
      where: { id: 1 },
      data: {
        defaultHearingLocation: "Barangay Hall Session Room",
        hearingDurationMinutes: 60,
        officeStartHour: 8,
        officeEndHour: 17,
        enforceOfficeHours: false,
        hearingGraceHours: 2,
        workingDaysOnly: false,
        holidays: [],
        reminderLeadHours: 24,
        puroks: [
          "Session Road",
          "Assumption Road",
          "Mabini Street",
          "General Luna Road",
          "Fr. Carlu Street",
        ],
        documentOfficeLine: "Office of the Punong Barangay",
      },
    });
  });

  it("skips weekends and holidays when deadlines use working days", () => {
    const thursday = new Date("2026-12-24T01:00:00.000Z"); // 09:00 PH
    const due = computeNextDueAt("received", thursday, {
      days: DEADLINE_DAYS,
      workingDaysOnly: true,
      holidays: ["2026-12-25"],
    });

    // Friday is a holiday, so the next working day is Monday.
    expect(due?.toISOString()).toBe("2026-12-28T01:00:00.000Z");

    const calendar = computeNextDueAt("received", thursday, {
      days: DEADLINE_DAYS,
    });
    expect(calendar?.toISOString()).toBe("2026-12-25T01:00:00.000Z");
  });

  it("enforces office hours and fills the default venue", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    await updateSettings(agent, token, {
      enforceOfficeHours: true,
      officeStartHour: 8,
      officeEndHour: 17,
      hearingDurationMinutes: 60,
      defaultHearingLocation: "Session Room A",
    });

    const late = new Date(Date.now() + 3 * DAY_MS);
    late.setUTCHours(14, 0, 0, 0); // 22:00 Philippine time

    const rejected = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({ complaintId, scheduledAt: late.toISOString(), kind: "mediation" })
      .expect(400);
    expect(rejected.body.fields.scheduledAt).toBeTruthy();

    const valid = new Date(Date.now() + 3 * DAY_MS);
    valid.setUTCHours(2, 0, 0, 0); // 10:00 Philippine time

    const created = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({ complaintId, scheduledAt: valid.toISOString(), kind: "mediation" })
      .expect(201);

    const hearing = await prisma.hearing.findUnique({
      where: { id: created.body.id as number },
    });
    expect(hearing!.location).toBe("Session Room A");

    const invalidPayload = {
      ...(await settingsPayload(agent)),
      officeStartHour: 17,
      officeEndHour: 8,
    };
    const invalidRange = await agent
      .patch("/api/settings")
      .set("x-csrf-token", token)
      .send(invalidPayload)
      .expect(400);
    expect(invalidRange.body.fields).toMatchObject({
      officeEndHour: expect.any(String),
    });
  });

  it("blocks overlapping sessions but allows back-to-back bookings", async () => {
    await createUser("admin");
    const firstComplaint = await filedComplaintId();
    const secondComplaint = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    await updateSettings(agent, token, {
      enforceOfficeHours: false,
      hearingDurationMinutes: 60,
    });

    const firstSlot = new Date(Date.now() + 4 * DAY_MS);
    firstSlot.setUTCHours(2, 0, 0, 0); // 10:00 PH

    await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId: firstComplaint,
        scheduledAt: firstSlot.toISOString(),
        kind: "mediation",
      })
      .expect(201);

    const overlapping = new Date(firstSlot.getTime() + 30 * 60 * 1000);
    const clash = await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId: secondComplaint,
        scheduledAt: overlapping.toISOString(),
        kind: "mediation",
      })
      .expect(409);
    expect(clash.body.message).toContain("already scheduled at that time");

    await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId: secondComplaint,
        scheduledAt: new Date(firstSlot.getTime() + HOUR_MS).toISOString(),
        kind: "mediation",
      })
      .expect(201);
  });

  it("serves the purok list to filings and rejects unknown puroks", async () => {
    await createUser("admin");
    const { agent, token } = await loginAgent("admin");

    await updateSettings(agent, token, {
      puroks: ["Session Road", "Mabini Street"],
    });

    const filing = request.agent(app);
    const filingToken = await csrfToken(filing);
    await submitComplaint(filing, filingToken, {
      complainantPurok: "Mabini Street",
    }).expect(200);

    const rejected = await submitComplaint(filing, filingToken, {
      complainantPurok: "Nowhere Street",
    }).expect(400);
    expect(rejected.body.fields).toMatchObject({
      complainantPurok: expect.any(String),
    });

    const emptyPayload = { ...(await settingsPayload(agent)), puroks: [] };
    const empty = await agent
      .patch("/api/settings")
      .set("x-csrf-token", token)
      .send(emptyPayload)
      .expect(400);
    expect(empty.body.fields).toMatchObject({
      puroks: expect.any(String),
    });

    const blankLinePayload = {
      ...(await settingsPayload(agent)),
      documentOfficeLine: "",
    };
    const blankLine = await agent
      .patch("/api/settings")
      .set("x-csrf-token", token)
      .send(blankLinePayload)
      .expect(400);
    expect(blankLine.body.fields).toMatchObject({
      documentOfficeLine: expect.any(String),
    });
  });

  it("publishes the officials roster, trimming duplicates and allowing none", async () => {
    await createUser("admin");
    const { agent, token } = await loginAgent("admin");

    await updateSettings(agent, token, {
      officials: [
        "Hon. Mario D. Santos — Punong Barangay",
        "  Hon. Bea Salcedo — Kagawad  ",
        "Hon. Mario D. Santos — Punong Barangay",
      ],
    });

    const published = await request(app).get("/api/settings").expect(200);
    expect(published.body.officials).toEqual([
      "Hon. Mario D. Santos — Punong Barangay",
      "Hon. Bea Salcedo — Kagawad",
    ]);

    const padded = {
      ...(await settingsPayload(agent)),
      officials: ["Hon. Bea Salcedo — Kagawad", "  ", ""],
    };
    const dropped = await agent
      .patch("/api/settings")
      .set("x-csrf-token", token)
      .send(padded)
      .expect(200);
    expect(dropped.body.officials).toEqual(["Hon. Bea Salcedo — Kagawad"]);

    const cleared = { ...(await settingsPayload(agent)), officials: [] };
    await agent
      .patch("/api/settings")
      .set("x-csrf-token", token)
      .send(cleared)
      .expect(200);
    const hidden = await request(app).get("/api/settings").expect(200);
    expect(hidden.body.officials).toEqual([]);
  });

  it("uses the configured pre-session reminder lead time", async () => {
    await createUser("admin");
    const complaintId = await filedComplaintId();
    const { agent, token } = await loginAgent("admin");

    await updateSettings(agent, token, {
      enforceOfficeHours: false,
      reminderLeadHours: 24,
    });

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);

    await agent
      .post("/api/hearings")
      .set("x-csrf-token", token)
      .send({
        complaintId,
        scheduledAt: new Date(Date.now() + 30 * HOUR_MS).toISOString(),
        kind: "mediation",
      })
      .expect(201);

    await runReminderScan();
    expect(
      await prisma.notification.count({ where: { type: "hearing_upcoming" } }),
    ).toBe(0);

    await updateSettings(agent, token, { reminderLeadHours: 48 });
    await runReminderScan();

    expect(
      await prisma.notification.count({ where: { type: "hearing_upcoming" } }),
    ).toBe(1);
  });
});
