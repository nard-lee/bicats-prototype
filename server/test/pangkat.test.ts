import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import type { ComplaintStatus } from "../src/modules/complaint/complaint.types.js";
import {
  arbitrationOf,
  createUser,
  csrfToken,
  loginAgent,
  luponRoster,
  pangkatOf,
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

async function addRoster(names: (string | { fullName: string; isActive: boolean })[]) {
  const members = [];

  for (const entry of names) {
    const data = typeof entry === "string" ? { fullName: entry } : entry;
    members.push(await prisma.luponMember.create({ data }));
  }

  return members;
}

// The step into conciliation now carries the panel, so tests about the Pangkat
// endpoint alone put the case at the stage straight in the database.
async function toConciliation(id: number) {
  await prisma.complaint.update({
    where: { id },
    data: { status: "conciliation" },
  });
}

// Cases built straight in the database: the gate tests need a case already at
// a given stage, and the public intake endpoint has an hourly filing cap.
async function caseAt(status: ComplaintStatus): Promise<number> {
  const complaint = await prisma.complaint.create({
    data: {
      reference: `PANG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
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
      eligibilityStatus: "eligible",
      consentAt: new Date(),
    },
    select: { id: true },
  });

  return complaint.id;
}

async function statusOf(id: number) {
  return prisma.complaint.findUnique({
    where: { id },
    select: { status: true },
  });
}

describe("Pangkat panel", () => {
  it("records three Lupon members with the elected chairman", async () => {
    const admin = await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");
    const [ana, ben, cesar] = await addRoster([
      "Ana Mendoza",
      "Ben Torres",
      "Cesar Lim",
    ]);

    await toConciliation(complaint!.id);

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ben!.id, ana!.id, cesar!.id], chairmanId: ana!.id })
      .expect(200);

    const expected = [
      { id: ana!.id, fullName: "Ana Mendoza", isChairman: true },
      { id: ben!.id, fullName: "Ben Torres", isChairman: false },
      { id: cesar!.id, fullName: "Cesar Lim", isChairman: false },
    ];

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.pangkatMembers).toEqual(expected);
    expect(updated!.pangkatChairman).toBe("Ana Mendoza");

    const detail = await agent
      .get(`/api/complaints/${complaint!.id}`)
      .expect(200);
    expect(detail.body.pangkatMembers).toEqual(expected);
    expect(detail.body.pangkatChairman).toBe("Ana Mendoza");

    await vi.waitFor(async () => {
      const audit = await prisma.auditLog.findFirst({
        where: { action: "complaint.pangkat.update", entityId: complaint!.id },
      });
      expect(audit).toMatchObject({
        actorId: admin.id,
        summary: expect.stringContaining('recorded as "Ana Mendoza (chairman)'),
      });
    });
  });

  it("keeps the recorded names when the roster is later renamed", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");
    const [ana, ben, cesar] = await addRoster([
      "Ana Mendoza",
      "Ben Torres",
      "Cesar Lim",
    ]);

    await toConciliation(complaint!.id);

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ana!.id, ben!.id, cesar!.id], chairmanId: ben!.id })
      .expect(200);

    await prisma.luponMember.update({
      where: { id: ben!.id },
      data: { fullName: "Ben T. Torres" },
    });

    const detail = await agent
      .get(`/api/complaints/${complaint!.id}`)
      .expect(200);
    expect(detail.body.pangkatChairman).toBe("Ben Torres");
    expect(detail.body.pangkatMembers[0]).toMatchObject({
      fullName: "Ben Torres",
      isChairman: true,
    });
  });

  it("replaces the panel and names the previous chairman in the audit", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");
    const [ana, ben, cesar, dina] = await addRoster([
      "Ana Mendoza",
      "Ben Torres",
      "Cesar Lim",
      "Dina Reyes",
    ]);

    await toConciliation(complaint!.id);

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ana!.id, ben!.id, cesar!.id], chairmanId: ana!.id })
      .expect(200);

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ben!.id, cesar!.id, dina!.id], chairmanId: ben!.id })
      .expect(200);

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.pangkatChairman).toBe("Ben Torres");

    await vi.waitFor(async () => {
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "complaint.pangkat.update",
          entityId: complaint!.id,
          summary: { contains: "changed from" },
        },
      });
      expect(audit?.summary).toContain("Ana Mendoza");
      expect(audit?.summary).toContain("Ben Torres (chairman)");
    });
  });

  it("requires exactly three members", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");
    const [ana, ben, cesar, dina] = await addRoster([
      "Ana Mendoza",
      "Ben Torres",
      "Cesar Lim",
      "Dina Reyes",
    ]);

    await toConciliation(complaint!.id);

    for (const memberIds of [
      [ana!.id, ben!.id],
      [ana!.id, ben!.id, cesar!.id, dina!.id],
    ]) {
      const response = await agent
        .patch(`/api/complaints/${complaint!.id}/pangkat`)
        .set("x-csrf-token", token)
        .send({ memberIds, chairmanId: ana!.id })
        .expect(400);

      expect(response.body.fields).toHaveProperty("memberIds");
    }

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.pangkatMembers).toBeNull();
  });

  it("requires three active members", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");
    const [ana, ben, cesar] = await addRoster([
      "Ana Mendoza",
      "Ben Torres",
      { fullName: "Cesar Lim", isActive: false },
    ]);

    await toConciliation(complaint!.id);

    const response = await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ana!.id, ben!.id, cesar!.id], chairmanId: ana!.id })
      .expect(400);

    expect(response.body.message).toContain("three active Lupon members");

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.pangkatMembers).toBeNull();
  });

  it("waits for conciliation before recording the panel", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");
    const [ana, ben, cesar] = await addRoster([
      "Ana Mendoza",
      "Ben Torres",
      "Cesar Lim",
    ]);

    for (const status of ["summoned", "mediation"]) {
      await agent
        .patch(`/api/complaints/${complaint!.id}/status`)
        .set("x-csrf-token", token)
        .send({ status })
        .expect(200);
    }

    const rejected = await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ana!.id, ben!.id, cesar!.id], chairmanId: ana!.id })
      .expect(409);

    expect(rejected.body.message).toContain("reaches conciliation");

    // The move into conciliation is refused on its own, then accepted with the
    // panel in the same request.
    const blockedMove = await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "conciliation" })
      .expect(409);

    expect(blockedMove.body.message).toContain("Pangkat ng Tagapagkasundo");
    expect((await statusOf(complaint!.id))!.status).toBe("mediation");

    await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ana!.id, ben!.id, cesar!.id], chairmanId: ana!.id, status: "conciliation" })
      .expect(200);

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
      select: { status: true, pangkatChairman: true },
    });
    expect(updated).toMatchObject({ status: "conciliation", pangkatChairman: "Ana Mendoza" });
  });

  it("refuses to enter conciliation before the Pangkat is on the record", async () => {
    await createUser("admin");
    const complaintId = await caseAt("mediation");
    const { agent, token } = await loginAgent("admin");

    const refused = await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "conciliation" })
      .expect(409);

    expect(refused.body.message).toContain("three members");

    const row = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { status: true, pangkatMembers: true, updates: { select: { id: true } } },
    });
    expect(row!.status).toBe("mediation");
    expect(row!.pangkatMembers).toBeNull();
    // Nothing half-written: the blocked move leaves no history entry either.
    expect(row!.updates).toHaveLength(0);
  });

  it("refuses to enter arbitration before the Pangkat is on the record", async () => {
    await createUser("admin");
    const complaintId = await caseAt("mediation");
    const { agent, token } = await loginAgent("admin");

    const refused = await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", ...arbitrationOf("pangkat") })
      .expect(409);

    expect(refused.body.message).toContain("Pangkat ng Tagapagkasundo");
    expect((await statusOf(complaintId))!.status).toBe("mediation");
  });

  it("writes the panel and the stage in one step and audits both", async () => {
    const admin = await createUser("admin");
    const complaintId = await caseAt("mediation");
    const members = await luponRoster();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "conciliation", ...pangkatOf(members) })
      .expect(200);

    const row = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { reference: true, status: true, pangkatMembers: true, pangkatChairman: true },
    });
    expect(row!.status).toBe("conciliation");
    expect(row!.pangkatChairman).toBe("Ana Mendoza");
    expect(row!.pangkatMembers).toEqual([
      { id: members[0]!.id, fullName: "Ana Mendoza", isChairman: true },
      { id: members[1]!.id, fullName: "Ben Torres", isChairman: false },
      { id: members[2]!.id, fullName: "Cesar Lim", isChairman: false },
    ]);

    await vi.waitFor(async () => {
      const audit = await prisma.auditLog.findFirst({
        where: { action: "complaint.pangkat.update", entityId: complaintId },
      });
      expect(audit).toMatchObject({
        actorId: admin.id,
        summary: expect.stringContaining('recorded as "Ana Mendoza (chairman)'),
      });
    });
  });

  it("keeps the recorded panel when a panelled case moves on", async () => {
    await createUser("admin");
    const complaintId = await caseAt("mediation");
    const members = await luponRoster();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "conciliation", ...pangkatOf(members) })
      .expect(200);

    // The Pangkat screen re-picks the chair, then the case moves on by itself.
    await agent
      .patch(`/api/complaints/${complaintId}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: members.map((member) => member.id), chairmanId: members[1]!.id })
      .expect(200);

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", ...arbitrationOf("pangkat") })
      .expect(200);

    const row = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { pangkatChairman: true },
    });
    expect(row!.pangkatChairman).toBe("Ben Torres");
  });

  it("rejects an incomplete panel without moving the case", async () => {
    await createUser("admin");
    const complaintId = await caseAt("mediation");
    const members = await luponRoster();
    const { agent, token } = await loginAgent("admin");

    const refused = await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({
        status: "conciliation",
        memberIds: members.slice(0, 2).map((member) => member.id),
        chairmanId: members[0]!.id,
      })
      .expect(400);

    expect(refused.body.fields).toHaveProperty("memberIds");
    expect((await statusOf(complaintId))!.status).toBe("mediation");
  });

  it("refuses to move cases into conciliation in bulk", async () => {
    await createUser("admin");
    const first = await caseAt("mediation");
    const second = await caseAt("conciliation");
    const { agent, token } = await loginAgent("admin");

    const refused = await agent
      .post("/api/complaints/bulk-status")
      .set("x-csrf-token", token)
      .send({ ids: [first, second], status: "conciliation" })
      .expect(409);

    expect(refused.body.message).toContain("Pangkat");
    expect((await statusOf(first))!.status).toBe("mediation");
  });

  it("requires the chairman to be one of the selected members", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");
    const [ana, ben, cesar, dina] = await addRoster([
      "Ana Mendoza",
      "Ben Torres",
      "Cesar Lim",
      "Dina Reyes",
    ]);

    await toConciliation(complaint!.id);

    const response = await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({
        memberIds: [ana!.id, ben!.id, cesar!.id],
        chairmanId: dina!.id,
      })
      .expect(400);

    expect(response.body.message).toContain("chairman must be one");
  });

  it("refuses to change the panel on a closed case", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");
    const [ana, ben, cesar] = await addRoster([
      "Ana Mendoza",
      "Ben Torres",
      "Cesar Lim",
    ]);

    for (const status of ["summoned", "mediation", "settled"]) {
      await agent
        .patch(`/api/complaints/${complaint!.id}/status`)
        .set("x-csrf-token", token)
        .send({ status })
        .expect(200);
    }

    const response = await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ana!.id, ben!.id, cesar!.id], chairmanId: ana!.id })
      .expect(409);

    expect(response.body.message).toContain("Reopen");
  });

  it("blocks accounts that cannot write to the case", async () => {
    await createUser("secretary");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("secretary");
    const [ana, ben, cesar] = await addRoster([
      "Ana Mendoza",
      "Ben Torres",
      "Cesar Lim",
    ]);

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ana!.id, ben!.id, cesar!.id], chairmanId: ana!.id })
      .expect(403);
  });
});
