import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import { csrfToken, submitComplaint } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function intake() {
  const agent = request.agent(app);
  const token = await csrfToken(agent);
  return { agent, token };
}

// The online desk takes adults whose incident has already happened. Both are
// decided at intake, so a rejection must leave nothing behind.
describe("intake age gate", () => {
  it("turns away a complainant under 18 and says to file in person", async () => {
    const { agent, token } = await intake();

    const response = await submitComplaint(agent, token, {
      complainantAge: "17",
    }).expect(400);

    expect(response.body.message).toBe("Validation failed");
    expect(response.body.fields.complainantAge).toMatch(/18 or older/);
    expect(response.body.fields.complainantAge).toMatch(/barangay hall/);
    expect(await prisma.complaint.count()).toBe(0);
  });

  it("reads a missing age as under 18 rather than as no answer", async () => {
    const { agent, token } = await intake();

    const response = await submitComplaint(agent, token, {
      complainantAge: "",
    }).expect(400);

    expect(response.body.fields.complainantAge).toMatch(/18 or older/);
    expect(await prisma.complaint.count()).toBe(0);
  });

  it("files a complainant who is exactly 18", async () => {
    const { agent, token } = await intake();

    const filed = await submitComplaint(agent, token, {
      complainantAge: "18",
    }).expect(200);

    const saved = await prisma.complaint.findUniqueOrThrow({
      where: { reference: filed.body.reference as string },
      select: { complainantAge: true },
    });

    expect(saved.complainantAge).toBe(18);
  });
});

describe("intake incident and contact guards", () => {
  it("refuses an incident dated in the future", async () => {
    const { agent, token } = await intake();

    const response = await submitComplaint(agent, token, {
      incidentAt: new Date(Date.now() + DAY_MS).toISOString(),
    }).expect(400);

    expect(response.body.fields.incidentAt).toMatch(/future/);
    expect(await prisma.complaint.count()).toBe(0);
  });

  it("requires a mobile number the intake form would also accept", async () => {
    const { agent, token } = await intake();

    const noPrefix = await submitComplaint(agent, token, {
      complainantContact: "917 123 4567",
    }).expect(400);

    expect(noPrefix.body.fields.complainantContact).toBeTruthy();
    expect(await prisma.complaint.count()).toBe(0);

    const international = await submitComplaint(agent, token, {
      complainantContact: "+63 917 123 4567",
    }).expect(200);

    const saved = await prisma.complaint.findUniqueOrThrow({
      where: { reference: international.body.reference as string },
      select: { contactNormalized: true },
    });

    expect(saved.contactNormalized).toBe("09171234567");
  });
});
