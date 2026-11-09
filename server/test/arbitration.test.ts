import { describe, expect, it } from "vitest";

import { prisma } from "../src/db.js";
import type { ComplaintStatus } from "../src/modules/complaint/complaint.types.js";
import {
  arbitrationOf,
  createUser,
  loginAgent,
  luponRoster,
  pangkatOf,
  pangkatSnapshotOf,
} from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// test/setup.ts pins every deadline to the KP defaults.
const ARBITRATION_DEADLINE_DAYS = 15;

// A case that reached the Pangkat's stages already has its panel on the
// record, because the move into them is gated on it.
const PANELLED: readonly ComplaintStatus[] = ["conciliation", "arbitration"];

// Cases built straight in the database: this flow starts mid-proceedings, and
// the public intake endpoint has an hourly filing cap.
async function caseAt(status: ComplaintStatus, reference: string): Promise<number> {
  const panelled = PANELLED.includes(status);
  const members = panelled ? await luponRoster() : [];

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
      ...(panelled && {
        pangkatMembers: pangkatSnapshotOf(members),
        pangkatChairman: members[0]!.fullName,
      }),
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

    // A case still in mediation has no panel, so the move brings it along;
    // the one already at conciliation has it on the record.
    await agent
      .patch(`/api/complaints/${conciliated}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", ...arbitrationOf("pangkat") })
      .expect(200);

    await agent
      .patch(`/api/complaints/${mediated}/status`)
      .set("x-csrf-token", token)
      .send({
        status: "arbitration",
        ...arbitrationOf("pangkat"),
        ...pangkatOf(await luponRoster()),
      })
      .expect(200);

    for (const id of [mediated, conciliated]) {
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

// Sec. 413 gives the parties two arbiters, and staff record which one on the
// move into the stage. The route decides whether a panel is needed at all.
describe("Sec. 413 arbiter choice", () => {
  async function arbiterOf(id: number) {
    return prisma.complaint.findUnique({
      where: { id },
      select: {
        status: true,
        arbitrationBy: true,
        arbitrationAgreementAt: true,
        pangkatMembers: true,
      },
    });
  }

  it("refuses to enter arbitration without the agreement and the arbiter", async () => {
    await createUser("admin");
    const panelled = await caseAt("conciliation", "ARB413-NONE");
    const { agent, token } = await loginAgent("admin");

    // Nothing recorded at all: the stage itself refuses the move.
    const bare = await agent
      .patch(`/api/complaints/${panelled}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration" })
      .expect(409);
    expect(bare.body.message).toContain("agreement to arbitrate");

    // The date alone is not a choice of arbiter, and vice versa.
    const noArbiter = await agent
      .patch(`/api/complaints/${panelled}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", arbitrationAgreementAt: new Date().toISOString() })
      .expect(400);
    expect(noArbiter.body.fields.arbitrationBy).toContain("who hears");

    const noDate = await agent
      .patch(`/api/complaints/${panelled}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", arbitrationBy: "pangkat" })
      .expect(400);
    expect(noDate.body.fields.arbitrationAgreementAt).toContain("agreed in writing");

    expect(await arbiterOf(panelled)).toMatchObject({
      status: "conciliation",
      arbitrationBy: null,
      arbitrationAgreementAt: null,
    });
  });

  it("keeps a future-dated agreement out of the record", async () => {
    await createUser("admin");
    const panelled = await caseAt("conciliation", "ARB413-FUTURE");
    const { agent, token } = await loginAgent("admin");

    const refused = await agent
      .patch(`/api/complaints/${panelled}/status`)
      .set("x-csrf-token", token)
      .send({
        status: "arbitration",
        ...arbitrationOf("pangkat", new Date(Date.now() + DAY_MS)),
      })
      .expect(400);

    expect(refused.body.fields.arbitrationAgreementAt).toContain("in the future");
    expect((await arbiterOf(panelled))!.status).toBe("conciliation");
  });

  it("hears a §413(a) arbitration with no Pangkat on the case", async () => {
    await createUser("admin");
    const mediated = await caseAt("mediation", "ARB413-PB");
    const agreementAt = new Date(Date.now() - 2 * DAY_MS);
    const { agent, token } = await loginAgent("admin");

    // Mediation belongs to the Punong Barangay, so the case has never had a
    // panel and the move into a §413(a) arbitration does not ask for one.
    await agent
      .patch(`/api/complaints/${mediated}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", ...arbitrationOf("punong_barangay", agreementAt) })
      .expect(200);

    const row = await arbiterOf(mediated);
    expect(row).toMatchObject({
      status: "arbitration",
      arbitrationBy: "punong_barangay",
      pangkatMembers: null,
    });
    expect(row!.arbitrationAgreementAt!.getTime()).toBe(agreementAt.getTime());
  });

  it("refuses the §413(b) route while the case has no panel", async () => {
    await createUser("admin");
    const mediated = await caseAt("mediation", "ARB413-NOPANEL");
    const { agent, token } = await loginAgent("admin");

    const refused = await agent
      .patch(`/api/complaints/${mediated}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", ...arbitrationOf("pangkat") })
      .expect(409);

    expect(refused.body.message).toContain("Pangkat ng Tagapagkasundo");
    expect(await arbiterOf(mediated)).toMatchObject({
      status: "mediation",
      arbitrationBy: null,
    });
  });

  it("refuses to switch the arbiter after the case entered arbitration", async () => {
    await createUser("admin");
    const mediated = await caseAt("mediation", "ARB413-SWITCH");
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${mediated}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", ...arbitrationOf("punong_barangay") })
      .expect(200);

    const refused = await agent
      .patch(`/api/complaints/${mediated}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", ...arbitrationOf("pangkat") })
      .expect(409);
    expect(refused.body.message).toContain("cannot be changed");

    expect(await arbiterOf(mediated)).toMatchObject({
      arbitrationBy: "punong_barangay",
      pangkatMembers: null,
    });
  });

  it("refuses to form a panel for a case the Punong Barangay hears alone", async () => {
    await createUser("admin");
    const mediated = await caseAt("mediation", "ARB413-EDIT");
    const members = await luponRoster();
    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${mediated}/status`)
      .set("x-csrf-token", token)
      .send({ status: "arbitration", ...arbitrationOf("punong_barangay") })
      .expect(200);

    const refused = await agent
      .patch(`/api/complaints/${mediated}/pangkat`)
      .set("x-csrf-token", token)
      .send(pangkatOf(members))
      .expect(409);
    expect(refused.body.message).toContain("Punong Barangay alone");

    expect((await arbiterOf(mediated))!.pangkatMembers).toBeNull();
  });

  it("takes the §413(b) route in bulk, where no arbiter can be picked", async () => {
    await createUser("admin");
    const conciliated = await caseAt("conciliation", "ARB413-BULK");
    const { agent, token } = await loginAgent("admin");

    await agent
      .post("/api/complaints/bulk-status")
      .set("x-csrf-token", token)
      .send({ ids: [conciliated], status: "arbitration" })
      .expect(200);

    const row = await arbiterOf(conciliated);
    expect(row).toMatchObject({ status: "arbitration", arbitrationBy: "pangkat" });
    expect(row!.arbitrationAgreementAt).toBeInstanceOf(Date);
  });
});
