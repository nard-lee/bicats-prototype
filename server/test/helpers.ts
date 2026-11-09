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
    complainantPurok: "Session Road",
    complainantContact: "0917 123 4567",
    complainantAddress: "12 Mabini Street",
    respondentName: "Pedro Reyes",
    respondentAddress: "Purok 3",
    relationship: "Neighbor",
    complaintType: "type1",
    incidentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    incidentPlace: "Purok 2 covered court",
    narrative: "Loud videoke until past midnight, disturbing the neighborhood.",
    eligResidency: "same_barangay",
    eligGovernment: "no",
    eligOffense: "no",
    eligProperty: "not_applicable",
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

// Entering conciliation or arbitration now requires the panel on the record,
// so a test that walks a case into those stages needs three members to elect a
// chair from.
export async function luponRoster(
  names: string[] = ["Ana Mendoza", "Ben Torres", "Cesar Lim"],
) {
  const members = [];

  for (const fullName of names) {
    members.push(await prisma.luponMember.create({ data: { fullName } }));
  }

  return members;
}

// The body a status PATCH carries when it moves into a Pangkat stage. The
// first member chairs unless the test says otherwise.
export function pangkatOf(members: { id: number }[]) {
  return {
    memberIds: members.map((member) => member.id),
    chairmanId: members[0]!.id,
  };
}

// The body a status PATCH carries on the move into arbitration: the date on
// the parties' written agreement and, per §413, which arbiter hears it.
export function arbitrationOf(
  by: "punong_barangay" | "pangkat" = "pangkat",
  agreementAt = new Date(),
) {
  return {
    arbitrationBy: by,
    arbitrationAgreementAt: agreementAt.toISOString(),
  };
}

// The same panel as frozen onto a case, for fixtures that start mid-process.
export function pangkatSnapshotOf(members: { id: number; fullName: string }[]) {
  const [chairman, ...rest] = members;

  return [
    { id: chairman!.id, fullName: chairman!.fullName, isChairman: true },
    ...rest.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      isChairman: false,
    })),
  ];
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
