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

describe("Pangkat chairman", () => {
  it("records the chairman on the case and reads it back", async () => {
    const admin = await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ pangkatChairman: "Hon. Ana Mendoza" })
      .expect(200);

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.pangkatChairman).toBe("Hon. Ana Mendoza");

    const detail = await agent
      .get(`/api/complaints/${complaint!.id}`)
      .expect(200);
    expect(detail.body.pangkatChairman).toBe("Hon. Ana Mendoza");

    await vi.waitFor(async () => {
      const audit = await prisma.auditLog.findFirst({
        where: { action: "complaint.pangkat.update", entityId: complaint!.id },
      });
      expect(audit).toMatchObject({
        actorId: admin.id,
        summary: expect.stringContaining("recorded as"),
      });
    });
  });

  it("replaces an existing chairman and names the previous one in the audit", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ pangkatChairman: "Hon. Ana Mendoza" })
      .expect(200);

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ pangkatChairman: "Hon. Ben Torres" })
      .expect(200);

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.pangkatChairman).toBe("Hon. Ben Torres");

    await vi.waitFor(async () => {
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "complaint.pangkat.update",
          entityId: complaint!.id,
          summary: { contains: "changed from" },
        },
      });
      expect(audit?.summary).toContain("Hon. Ana Mendoza");
      expect(audit?.summary).toContain("Hon. Ben Torres");
    });
  });

  it("rejects a blank name with the field error envelope", async () => {
    await createUser("lupon");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("lupon");

    const response = await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ pangkatChairman: "  a  " })
      .expect(400);

    expect(response.body.fields).toHaveProperty("pangkatChairman");

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.pangkatChairman).toBeNull();
  });

  it("refuses to change the Pangkat on a closed case", async () => {
    await createUser("admin");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("admin");

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
      .send({ pangkatChairman: "Hon. Ana Mendoza" })
      .expect(409);

    expect(response.body.message).toContain("Reopen");
  });

  it("blocks accounts that cannot write to the case", async () => {
    await createUser("secretary");
    const complaint = await filedComplaint();
    const { agent, token } = await loginAgent("secretary");

    await agent
      .patch(`/api/complaints/${complaint!.id}/pangkat`)
      .set("x-csrf-token", token)
      .send({ pangkatChairman: "Hon. Ana Mendoza" })
      .expect(403);
  });
});
