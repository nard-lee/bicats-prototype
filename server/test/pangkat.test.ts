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

// The Pangkat is only constituted at conciliation; mediation belongs to the
// Punong Barangay.
async function advanceToConciliation(
  agent: ReturnType<typeof request.agent>,
  token: string,
  id: number,
) {
  for (const status of ["summoned", "mediation", "conciliation"]) {
    await agent
      .patch(`/api/complaints/${id}/status`)
      .set("x-csrf-token", token)
      .send({ status })
      .expect(200);
  }
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

    await advanceToConciliation(agent, token, complaint!.id);

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

    await advanceToConciliation(agent, token, complaint!.id);

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

    await advanceToConciliation(agent, token, complaint!.id);

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

    await advanceToConciliation(agent, token, complaint!.id);

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

    await advanceToConciliation(agent, token, complaint!.id);

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

    await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "conciliation" })
      .expect(200);

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ana!.id, ben!.id, cesar!.id], chairmanId: ana!.id })
      .expect(200);

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.pangkatChairman).toBe("Ana Mendoza");
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

    await advanceToConciliation(agent, token, complaint!.id);

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

    for (const status of ["summoned", "mediation", "conciliation", "settled"]) {
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
