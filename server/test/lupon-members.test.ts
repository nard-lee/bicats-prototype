import { describe, expect, it } from "vitest";

import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import { createUser, loginAgent } from "./helpers.js";

describe("Lupon roster", () => {
  it("lists members for any staff role, active first then by name", async () => {
    await createUser("secretary");
    await prisma.luponMember.createMany({
      data: [
        { fullName: "Zara Santos" },
        { fullName: "Ana Cruz", isActive: false },
        { fullName: "Ben Reyes" },
      ],
    });
    const { agent } = await loginAgent("secretary");

    const response = await agent.get("/api/lupon-members").expect(200);

    expect(
      response.body.items.map((member: { fullName: string }) => member.fullName),
    ).toEqual(["Ben Reyes", "Zara Santos", "Ana Cruz"]);
  });

  it("publishes current members' names to the site, and nothing else", async () => {
    await prisma.luponMember.createMany({
      data: [
        { fullName: "Zara Santos", contact: "0917 555 0142" },
        { fullName: "Ana Cruz", isActive: false },
        { fullName: "Ben Reyes" },
      ],
    });

    const response = await request(app)
      .get("/api/lupon-members/public")
      .expect(200);

    expect(response.body.items).toEqual(["Ben Reyes", "Zara Santos"]);
    expect(JSON.stringify(response.body)).not.toContain("0917 555 0142");
  });

  it("lets an admin add, edit, deactivate, and remove a member", async () => {
    await createUser("admin");
    const { agent, token } = await loginAgent("admin");

    const created = await agent
      .post("/api/lupon-members")
      .set("x-csrf-token", token)
      .send({ fullName: "  Liza Mercado  ", contact: " 0917 555 0142 " })
      .expect(201);

    expect(created.body).toMatchObject({
      fullName: "Liza Mercado",
      contact: "0917 555 0142",
      isActive: true,
    });
    const id = created.body.id as number;

    const renamed = await agent
      .patch(`/api/lupon-members/${id}`)
      .set("x-csrf-token", token)
      .send({ fullName: "Liza M. Mercado" })
      .expect(200);
    expect(renamed.body).toMatchObject({
      fullName: "Liza M. Mercado",
      contact: "0917 555 0142",
    });

    const deactivated = await agent
      .patch(`/api/lupon-members/${id}`)
      .set("x-csrf-token", token)
      .send({ isActive: false, contact: "" })
      .expect(200);
    expect(deactivated.body).toMatchObject({ isActive: false, contact: null });

    await agent
      .delete(`/api/lupon-members/${id}`)
      .set("x-csrf-token", token)
      .expect(200);

    expect(await prisma.luponMember.count()).toBe(0);
  });

  it("keeps recorded panels readable after a member leaves the roster", async () => {
    await createUser("admin");
    const { agent, token } = await loginAgent("admin");

    const member = await prisma.luponMember.create({
      data: { fullName: "Ana Mendoza" },
    });
    await agent
      .delete(`/api/lupon-members/${member.id}`)
      .set("x-csrf-token", token)
      .expect(200);

    const complaint = await prisma.complaint.create({
      data: {
        reference: "TEST-PANGKAT",
        complainantName: "Juan Dela Cruz",
        complainantAge: 34,
        complainantPurok: "Session Road",
        complainantContact: "0917 123 4567",
        contactNormalized: "09171234567",
        complainantAddress: "12 Mabini Street",
        respondentName: "Pedro Reyes",
        complaintType: "type1",
        incidentAt: new Date(),
        incidentPlace: "Purok 2",
        narrative: "A test complaint about noise.",
        status: "conciliation",
        consentAt: new Date(),
        pangkatChairman: "Ana Mendoza",
        pangkatMembers: [
          { id: member.id, fullName: "Ana Mendoza", isChairman: true },
        ],
      },
    });

    const detail = await agent
      .get(`/api/complaints/${complaint.id}`)
      .expect(200);
    expect(detail.body.pangkatChairman).toBe("Ana Mendoza");
    expect(detail.body.pangkatMembers).toHaveLength(1);
  });

  it("validates the name and survives a bad id", async () => {
    await createUser("admin");
    const { agent, token } = await loginAgent("admin");

    const blank = await agent
      .post("/api/lupon-members")
      .set("x-csrf-token", token)
      .send({ fullName: " A " })
      .expect(400);
    expect(blank.body.fields).toHaveProperty("fullName");

    const badId = await agent
      .patch("/api/lupon-members/not-a-number")
      .set("x-csrf-token", token)
      .send({ fullName: "Ana Mendoza" })
      .expect(400);
    expect(badId.body.message).toContain("Invalid Lupon member ID");

    const missing = await agent
      .patch("/api/lupon-members/9999")
      .set("x-csrf-token", token)
      .send({ fullName: "Ana Mendoza" })
      .expect(404);
    expect(missing.body.message).toContain("not found");

    await agent
      .delete("/api/lupon-members/9999")
      .set("x-csrf-token", token)
      .expect(404);
  });

  it("keeps the roster read-only for accounts that cannot administer it", async () => {
    await createUser("lupon");
    const { agent, token } = await loginAgent("lupon");

    const member = await prisma.luponMember.create({
      data: { fullName: "Ana Mendoza" },
    });

    await agent.get("/api/lupon-members").expect(200);

    await agent
      .post("/api/lupon-members")
      .set("x-csrf-token", token)
      .send({ fullName: "Ben Torres" })
      .expect(403);

    await agent
      .patch(`/api/lupon-members/${member.id}`)
      .set("x-csrf-token", token)
      .send({ fullName: "Renamed" })
      .expect(403);

    await agent
      .delete(`/api/lupon-members/${member.id}`)
      .set("x-csrf-token", token)
      .expect(403);

    expect(await prisma.luponMember.count()).toBe(1);
  });
});
