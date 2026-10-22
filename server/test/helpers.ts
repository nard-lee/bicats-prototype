import path from "node:path";
import argon2 from "argon2";
import supertest from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import type { Role } from "../src/utils/roles.js";

export const PASSWORD = "password123";
export const UPLOADS_DIR = path.resolve(import.meta.dirname, "../uploads");

type Agent = ReturnType<typeof supertest.agent>;

const PHONES: Record<Role, string> = {
  admin: "09171000001",
  staff: "09171000002",
  secretary: "09171000003",
  lupon: "09171000004",
};

let passwordHash: string | null = null;

export async function createUser(role: Role) {
  passwordHash ??= await argon2.hash(PASSWORD);

  return prisma.user.create({
    data: {
      fullName: `${role} account`,
      position: "Test",
      email: `${role}@bicats.test`,
      phone: PHONES[role],
      username: role,
      passwordHash,
      role,
    },
  });
}

export async function csrfToken(agent: Agent): Promise<string> {
  const response = await agent.get("/api/csrf-token").expect(200);
  return response.body.csrfToken as string;
}

export async function loginAgent(
  role: Role,
): Promise<{ agent: Agent; token: string }> {
  const agent = supertest.agent(app);
  const token = await csrfToken(agent);

  await agent
    .post("/api/auth/log-in")
    .set("x-csrf-token", token)
    .send({ identifier: role, password: PASSWORD })
    .expect(200);

  return { agent, token };
}

export function complaintFields(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    complainantName: "Juan Dela Cruz",
    complainantAge: "34",
    complainantPurok: "Purok 2",
    complainantContact: "0917 123 4567",
    complainantAddress: "12 Mabini Street",
    respondentName: "Pedro Reyes",
    respondentAddress: "Purok 3",
    relationship: "Neighbor",
    complaintType: "type1",
    incidentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    incidentPlace: "Purok 2 covered court",
    narrative: "Loud videoke until past midnight, disturbing the neighborhood.",
    consent: "on",
    ...overrides,
  };
}

export function submitComplaint(
  agent: Agent,
  token: string,
  overrides: Record<string, string> = {},
) {
  let req = agent
    .post("/api/complaints/file-complaint")
    .set("x-csrf-token", token);

  for (const [key, value] of Object.entries(complaintFields(overrides))) {
    req = req.field(key, value);
  }

  return req;
}

export function refreshTokenFrom(headers: Record<string, unknown>): string | undefined {
  const cookies = headers["set-cookie"];
  const list = Array.isArray(cookies)
    ? (cookies as string[])
    : typeof cookies === "string"
      ? [cookies]
      : [];

  const cookie = list.find((value) => value.startsWith("refresh_token="));
  return cookie?.split(";")[0]?.split("=")[1];
}
