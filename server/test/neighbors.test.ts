import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import {
  createUser,
  csrfToken,
  loginAgent,
  submitComplaint,
} from "./helpers.js";

type Agent = Parameters<typeof submitComplaint>[0];

async function fileCase(agent: Agent, token: string): Promise<number> {
  const response = await submitComplaint(agent, token).expect(200);
  const row = await prisma.complaint.findUniqueOrThrow({
    where: { reference: response.body.reference },
    select: { id: true },
  });
  return row.id;
}

describe("complaint neighbors", () => {
  it("links cases in list order with an id tiebreak", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const oldest = await fileCase(agent, token);
    const middle = await fileCase(agent, token);
    const newest = await fileCase(agent, token);

    // Pin timestamps so ordering doesn't depend on request timing. Middle and
    // newest share a timestamp so only the id tiebreak separates them.
    const shared = new Date("2020-01-01T00:00:00.000Z");
    await prisma.complaint.update({
      where: { id: oldest },
      data: { createdAt: new Date(shared.getTime() - 1000) },
    });
    await prisma.complaint.update({
      where: { id: middle },
      data: { createdAt: shared },
    });
    await prisma.complaint.update({
      where: { id: newest },
      data: { createdAt: shared },
    });

    await createUser("secretary");
    const { agent: staff } = await loginAgent("secretary");

    const detail = async (id: number) => {
      const response = await staff.get(`/api/complaints/${id}`).expect(200);
      return response.body;
    };

    expect(await detail(oldest)).toMatchObject({ prevId: middle, nextId: null });
    expect(await detail(middle)).toMatchObject({ prevId: newest, nextId: oldest });
    expect(await detail(newest)).toMatchObject({ prevId: null, nextId: middle });
  });
});
