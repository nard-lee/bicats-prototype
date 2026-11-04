import { describe, expect, it } from "vitest";

import { prisma } from "../src/db.js";
import type { ComplaintStatus } from "../src/modules/complaint/complaint.types.js";
import { createUser, loginAgent } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// test/setup.ts pins every deadline to the KP defaults.
const ARBITRATION_DEADLINE_DAYS = 15;

// Cases built straight in the database: this flow starts mid-proceedings, and
// the public intake endpoint has an hourly filing cap.
async function caseAt(status: ComplaintStatus, reference: string): Promise<number> {
  const complaint = await prisma.complaint.create({
    data: {
      reference,
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
    select: { status: true, dueAt: true },
  });
}

describe("Arbitration stage", () => {
  it("refers a case to arbitration only once it is being heard", async () => {
    await createUser("admin");
    const intake = await caseAt("received", "ARB-INTAKE");
    const summoned = await caseAt("summoned", "ARB-SUMMONED");
    const mediated = await caseAt("mediation", "ARB-MEDIATION");
    const conciliated = await caseAt("conciliation", "ARB-CONCILIATION");
    const { agent, token } = await loginAgent("admin");

    for (const id of [intake, summoned]) {
      const refused = await agent
        .patch(`/api/complaints/${id}/status`)
        .set("x-csrf-token", token)
        .send({ status: "arbitration" })
        .expect(409);
      expect(refused.body.message).toContain("can't move from");
    }

    for (const id of [mediated, conciliated]) {
      await agent
        .patch(`/api/complaints/${id}/status`)
        .set("x-csrf-token", token)
        .send({ status: "arbitration" })
        .expect(200);

      const row = await statusOf(id);
      expect(row!.status).toBe("arbitration");
      const daysUntilDue = (row!.dueAt!.getTime() - Date.now()) / DAY_MS;
      expect(daysUntilDue).toBeGreaterThan(ARBITRATION_DEADLINE_DAYS - 0.1);
      expect(daysUntilDue).toBeLessThan(ARBITRATION_DEADLINE_DAYS + 0.1);
    }
  });

  it("closes on an award or on a certification to file action", async () => {
    await createUser("admin");
    const withAward = await caseAt("arbitration", "ARB-AWARD");
    const withoutAward = await caseAt("arbitration", "ARB-NONE");
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${withAward}/status`)
      .set("x-csrf-token", token)
      .send({
        status: "settled",
        publicNote: "The Pangkat rendered an arbitration award the parties accepted.",
      })
      .expect(200);

    const settled = await prisma.complaint.findUnique({
      where: { id: withAward },
      select: { status: true, dueAt: true },
    });
    expect(settled).toEqual({ status: "settled", dueAt: null });

    await agent
      .patch(`/api/complaints/${withoutAward}/status`)
      .set("x-csrf-token", token)
      .send({ status: "certified" })
      .expect(200);

    const certified = await statusOf(withoutAward);
    expect(certified!.status).toBe("certified");
    expect(certified!.dueAt).toBeNull();
  });

  it("books the award hearing and keeps the Pangkat reachable", async () => {
    await createUser("admin");
    const complaintId = await caseAt("arbitration", "ARB-SESSION");
    const ana = await prisma.luponMember.create({ data: { fullName: "Ana Mendoza" } });
    const ben = await prisma.luponMember.create({ data: { fullName: "Ben Torres" } });
    const cesar = await prisma.luponMember.create({ data: { fullName: "Cesar Lim" } });
    const { agent, token } = await loginAgent("admin");

    const scheduledAt = new Date(Date.now() + 2 * DAY_MS);
    scheduledAt.setUTCHours(2, 0, 0, 0); // 10:00 in the Philippines

    await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", hearingAt: scheduledAt.toISOString() })
      .expect(200);

    const session = await prisma.hearing.findFirst({
      where: { complaintId },
      select: { kind: true, scheduledAt: true },
    });
    expect(session!.kind).toBe("hearing");
    expect(session!.scheduledAt.getTime()).toBe(scheduledAt.getTime());

    await agent
      .patch(`/api/complaints/${complaintId}/pangkat`)
      .set("x-csrf-token", token)
      .send({ memberIds: [ana.id, ben.id, cesar.id], chairmanId: ana.id })
      .expect(200);

    const updated = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { pangkatChairman: true, pangkatMembers: true },
    });
    expect(updated!.pangkatChairman).toBe("Ana Mendoza");
    expect(updated!.pangkatMembers).toHaveLength(3);
  });

  it("rejects arbitration on a case pending eligibility review", async () => {
    await createUser("admin");
    const complaintId = await caseAt("mediation", "ARB-REVIEW");
    await prisma.complaint.update({
      where: { id: complaintId },
      data: { eligibilityStatus: "needs_review" },
    });
    const { agent, token } = await loginAgent("admin");

    const refused = await agent
      .patch(`/api/complaints/${complaintId}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration" })
      .expect(409);
    expect(refused.body.message).toContain("eligibility review");

    expect(await statusOf(complaintId)).toMatchObject({ status: "mediation" });
  });
});
