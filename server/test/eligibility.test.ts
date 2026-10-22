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

describe("eligibility screening", () => {
  it("blocks filings that fall outside KP authority", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const response = await submitComplaint(agent, token, {
      eligResidency: "different_city",
      eligAdjoining: "no",
    }).expect(400);

    expect(response.body.message).toBe("Validation failed");
    expect(response.body.fields).toMatchObject({
      eligAdjoining: expect.any(String),
    });
    expect(await prisma.complaint.count()).toBe(0);
  });

  it("stores screened answers and routes uncertain cases to staff", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const filed = await submitComplaint(agent, token, {
      eligOffense: "unsure",
    }).expect(200);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: filed.body.reference as string },
    });

    expect(complaint!.eligibilityStatus).toBe("needs_review");
    expect(complaint!.eligibilityAnswers).toEqual({
      respondentResidency: "same_barangay",
      adjoiningAgreement: null,
      againstGovernment: "no",
      seriousOffenseOrVawc: "unsure",
      propertyOutsideCity: "not_applicable",
      propertyAgreement: null,
    });
  });

  it("marks clear filings eligible and lets staff change the decision", async () => {
    const admin = await createUser("admin");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);
    const filed = await submitComplaint(publicAgent, publicToken).expect(200);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: filed.body.reference as string },
    });
    expect(complaint!.eligibilityStatus).toBe("eligible");

    const { agent, token } = await loginAgent("admin");

    const detail = await agent
      .get(`/api/complaints/${complaint!.id}`)
      .expect(200);
    expect(detail.body.eligibilityStatus).toBe("eligible");
    expect(detail.body.eligibilityAnswers).toMatchObject({
      respondentResidency: "same_barangay",
      againstGovernment: "no",
      seriousOffenseOrVawc: "no",
      propertyOutsideCity: "not_applicable",
    });
    expect(detail.body.eligibilityNotes).toBeNull();
    expect(detail.body.eligibilityReviewedAt).toBeNull();

    const invalid = await agent
      .patch(`/api/complaints/${complaint!.id}/eligibility`)
      .set("x-csrf-token", token)
      .send({ eligibilityStatus: "unreviewed" })
      .expect(400);
    expect(invalid.body.fields).toMatchObject({
      eligibilityStatus: expect.any(String),
    });

    await agent
      .patch(`/api/complaints/${complaint!.id}/eligibility`)
      .set("x-csrf-token", token)
      .send({
        eligibilityStatus: "needs_review",
        eligibilityNotes: "Verify the respondent's barangay.",
      })
      .expect(200);

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(updated!.eligibilityStatus).toBe("needs_review");
    expect(updated!.eligibilityNotes).toBe("Verify the respondent's barangay.");
    expect(updated!.eligibilityReviewedAt).not.toBeNull();

    await vi.waitFor(async () => {
      const entry = await prisma.auditLog.findFirst({
        where: { action: "complaint.eligibility.update" },
      });
      expect(entry).not.toBeNull();
      expect(entry!.summary).toContain(complaint!.reference);
      expect(entry!.actorId).toBe(admin.id);
    });
  });

  it("keeps eligibility review read-only for the secretary", async () => {
    await createUser("secretary");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);
    const filed = await submitComplaint(publicAgent, publicToken).expect(200);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: filed.body.reference as string },
    });

    const { agent, token } = await loginAgent("secretary");

    const denied = await agent
      .patch(`/api/complaints/${complaint!.id}/eligibility`)
      .set("x-csrf-token", token)
      .send({ eligibilityStatus: "outside_kp" })
      .expect(403);
    expect(denied.body).toEqual({ message: "Insufficient permissions" });

    const unchanged = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
      select: { eligibilityStatus: true },
    });
    expect(unchanged!.eligibilityStatus).toBe("eligible");
  });

  it("blocks status changes while eligibility review is pending", async () => {
    const admin = await createUser("admin");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);
    const filed = await submitComplaint(publicAgent, publicToken, {
      eligOffense: "unsure",
    }).expect(200);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: filed.body.reference as string },
    });
    expect(complaint!.eligibilityStatus).toBe("needs_review");

    const { agent, token } = await loginAgent("admin");

    const held = await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(409);
    expect(held.body.message).toContain("pending an eligibility review");

    const stillReceived = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
      select: { status: true, eligibilityStatus: true },
    });
    expect(stillReceived).toEqual({
      status: "received",
      eligibilityStatus: "needs_review",
    });

    await agent
      .patch(`/api/complaints/${complaint!.id}/eligibility`)
      .set("x-csrf-token", token)
      .send({ eligibilityStatus: "eligible" })
      .expect(200);

    await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);

    const released = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
      select: { status: true },
    });
    expect(released!.status).toBe("summoned");

    await vi.waitFor(async () => {
      const entry = await prisma.auditLog.findFirst({
        where: { action: "complaint.status.update" },
      });
      expect(entry!.actorId).toBe(admin.id);
    });
  });

  it("blocks status changes until an unscreened case is reviewed", async () => {
    await createUser("admin");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);
    const filed = await submitComplaint(publicAgent, publicToken).expect(200);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: filed.body.reference as string },
    });
    await prisma.complaint.update({
      where: { id: complaint!.id },
      data: { eligibilityStatus: "unreviewed" },
    });

    const { agent, token } = await loginAgent("admin");

    const held = await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(409);
    expect(held.body.message).toContain("has not been screened");

    const bulkHeld = await agent
      .post("/api/complaints/bulk-status")
      .set("x-csrf-token", token)
      .send({ ids: [complaint!.id], status: "summoned" })
      .expect(409);
    expect(bulkHeld.body.message).toContain(complaint!.reference);

    const unchanged = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
      select: { status: true, eligibilityStatus: true },
    });
    expect(unchanged).toEqual({
      status: "received",
      eligibilityStatus: "unreviewed",
    });

    await agent
      .patch(`/api/complaints/${complaint!.id}/eligibility`)
      .set("x-csrf-token", token)
      .send({ eligibilityStatus: "eligible" })
      .expect(200);

    await agent
      .patch(`/api/complaints/${complaint!.id}/status`)
      .set("x-csrf-token", token)
      .send({ status: "summoned" })
      .expect(200);
  });

  it("dismisses the case when staff mark it outside KP", async () => {
    const admin = await createUser("admin");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);
    const filed = await submitComplaint(publicAgent, publicToken).expect(200);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: filed.body.reference as string },
    });

    const { agent, token } = await loginAgent("admin");

    await agent
      .patch(`/api/complaints/${complaint!.id}/eligibility`)
      .set("x-csrf-token", token)
      .send({
        eligibilityStatus: "outside_kp",
        eligibilityNotes: "The disputed lot is in another city.",
      })
      .expect(200);

    const dismissed = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(dismissed!.status).toBe("dismissed");
    expect(dismissed!.dueAt).toBeNull();
    expect(dismissed!.priority).toBe("none");
    expect(dismissed!.eligibilityStatus).toBe("outside_kp");

    const entry = await prisma.statusUpdate.findFirst({
      where: { complaintId: complaint!.id, status: "dismissed" },
    });
    expect(entry).not.toBeNull();
    expect(entry!.publicNote).toContain("outside the authority");
    expect(entry!.internalNote).toBe("The disputed lot is in another city.");
    expect(entry!.createdById).toBe(admin.id);

    await vi.waitFor(async () => {
      const audit = await prisma.auditLog.findFirst({
        where: { action: "complaint.eligibility.update" },
      });
      expect(audit!.summary).toContain("auto-dismissed");
      expect(audit!.meta).toMatchObject({ dismissed: true });
    });
  });

  it("rejects the complaint with a reason and dismisses the case", async () => {
    const admin = await createUser("admin");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);
    const filed = await submitComplaint(publicAgent, publicToken).expect(200);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: filed.body.reference as string },
    });

    const { agent, token } = await loginAgent("admin");

    const missingReason = await agent
      .patch(`/api/complaints/${complaint!.id}/eligibility`)
      .set("x-csrf-token", token)
      .send({
        eligibilityStatus: "rejected",
        eligibilityNotes: "Withdrawal confirmed by phone.",
      })
      .expect(400);
    expect(missingReason.body.fields).toMatchObject({
      eligibilityReason: expect.any(String),
    });

    await agent
      .patch(`/api/complaints/${complaint!.id}/eligibility`)
      .set("x-csrf-token", token)
      .send({
        eligibilityStatus: "rejected",
        eligibilityReason: "The complaint was withdrawn by the complainant.",
        eligibilityNotes: "Withdrawal confirmed by phone.",
      })
      .expect(200);

    const rejected = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
    });
    expect(rejected!.status).toBe("dismissed");
    expect(rejected!.dueAt).toBeNull();
    expect(rejected!.priority).toBe("none");
    expect(rejected!.eligibilityStatus).toBe("rejected");
    expect(rejected!.eligibilityReason).toBe(
      "The complaint was withdrawn by the complainant.",
    );

    const entry = await prisma.statusUpdate.findFirst({
      where: { complaintId: complaint!.id, status: "dismissed" },
    });
    expect(entry).not.toBeNull();
    expect(entry!.publicNote).toBe(
      "Complaint rejected: The complaint was withdrawn by the complainant.",
    );
    expect(entry!.internalNote).toBe("Withdrawal confirmed by phone.");
    expect(entry!.createdById).toBe(admin.id);
  });

  it("rejects bulk status changes for held cases", async () => {
    await createUser("admin");

    const publicAgent = request.agent(app);
    const publicToken = await csrfToken(publicAgent);
    const filed = await submitComplaint(publicAgent, publicToken, {
      eligGovernment: "unsure",
    }).expect(200);

    const complaint = await prisma.complaint.findUnique({
      where: { reference: filed.body.reference as string },
    });

    const { agent, token } = await loginAgent("admin");

    const rejected = await agent
      .post("/api/complaints/bulk-status")
      .set("x-csrf-token", token)
      .send({ ids: [complaint!.id], status: "summoned" })
      .expect(409);
    expect(rejected.body.message).toContain(complaint!.reference);

    const unchanged = await prisma.complaint.findUnique({
      where: { id: complaint!.id },
      select: { status: true },
    });
    expect(unchanged!.status).toBe("received");
  });
});
