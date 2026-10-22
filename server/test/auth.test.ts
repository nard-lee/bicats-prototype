import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import { prisma } from "../src/db.js";
import {
  PASSWORD,
  createUser,
  csrfToken,
  loginAgent,
  refreshTokenFrom,
} from "./helpers.js";

function setCookie(
  headers: Record<string, unknown>,
  name: string,
): string | undefined {
  const raw = headers["set-cookie"];
  const list = Array.isArray(raw)
    ? (raw as string[])
    : typeof raw === "string"
      ? [raw]
      : [];

  return list.find((value) => value.startsWith(`${name}=`));
}

const isSessionCookie = (cookie: string | undefined) =>
  !!cookie && !/Max-Age=/i.test(cookie) && !/Expires=/i.test(cookie);

describe("authentication", () => {
  it("rejects state-changing requests without a CSRF token", async () => {
    const response = await request(app)
      .post("/api/auth/log-in")
      .send({ identifier: "admin", password: PASSWORD });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "invalid csrf token" });
  });

  it("logs in and returns the signed-in account", async () => {
    const user = await createUser("admin");
    const { agent } = await loginAgent("admin");

    const me = await agent.get("/api/auth/me").expect(200);

    expect(me.body).toMatchObject({
      id: user.id,
      email: "admin@bicats.test",
      role: "admin",
    });
    expect(me.body.passwordHash).toBeUndefined();
  });

  it("uses the shared error envelope for bad credentials and validation", async () => {
    await createUser("admin");

    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const wrongPassword = await agent
      .post("/api/auth/log-in")
      .set("x-csrf-token", token)
      .send({ identifier: "admin", password: "not-the-password" })
      .expect(401);

    expect(wrongPassword.body).toEqual({
      message: "Invalid credentials",
      fields: { password: "Incorrect password" },
    });

    const invalid = await agent
      .post("/api/auth/log-in")
      .set("x-csrf-token", token)
      .send({})
      .expect(400);

    expect(invalid.body.message).toBe("Validation failed");
    expect(invalid.body.fields).toMatchObject({
      identifier: expect.any(String),
      password: expect.any(String),
    });
  });

  it("rejects missing and deactivated sessions", async () => {
    const anonymous = await request(app).get("/api/auth/me").expect(401);
    expect(anonymous.body).toEqual({ message: "Missing access token" });

    const user = await createUser("staff");
    const { agent } = await loginAgent("staff");

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const deactivated = await agent.get("/api/auth/me").expect(401);
    expect(deactivated.body).toEqual({ message: "Account is not active" });
  });

  it("rotates the refresh token and keeps the access token working", async () => {
    const user = await createUser("secretary");
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const login = await agent
      .post("/api/auth/log-in")
      .set("x-csrf-token", token)
      .send({ identifier: "secretary", password: PASSWORD })
      .expect(200);

    const oldRefreshToken = refreshTokenFrom(login.headers);
    expect(oldRefreshToken).toBeTruthy();
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1);

    await agent
      .post("/api/auth/refresh")
      .set("x-csrf-token", token)
      .expect(200);

    const storedOld = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken! },
    });
    expect(storedOld).toBeNull();

    const tokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    });
    expect(tokens).toHaveLength(1);

    await agent.get("/api/auth/me").expect(200);
  });

  it("issues session cookies when remember me is off", async () => {
    const user = await createUser("staff");
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const login = await agent
      .post("/api/auth/log-in")
      .set("x-csrf-token", token)
      .send({ identifier: "staff", password: PASSWORD })
      .expect(200);

    expect(isSessionCookie(setCookie(login.headers, "access_token"))).toBe(true);
    expect(isSessionCookie(setCookie(login.headers, "refresh_token"))).toBe(true);

    const stored = await prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });
    expect(stored!.remember).toBe(false);

    const refreshed = await agent
      .post("/api/auth/refresh")
      .set("x-csrf-token", token)
      .expect(200);

    expect(isSessionCookie(setCookie(refreshed.headers, "refresh_token"))).toBe(true);

    const rotated = await prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });
    expect(rotated!.remember).toBe(false);
  });

  it("keeps the refresh cookie persistent across refreshes when remember me is on", async () => {
    const user = await createUser("admin");
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const login = await agent
      .post("/api/auth/log-in")
      .set("x-csrf-token", token)
      .send({ identifier: "admin", password: PASSWORD, remember: true })
      .expect(200);

    const loginRefresh = setCookie(login.headers, "refresh_token");
    expect(loginRefresh).toMatch(/Max-Age=\d+/i);
    expect(isSessionCookie(setCookie(login.headers, "access_token"))).toBe(true);

    const remembered = await prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });
    expect(remembered!.remember).toBe(true);

    const refreshed = await agent
      .post("/api/auth/refresh")
      .set("x-csrf-token", token)
      .expect(200);

    expect(setCookie(refreshed.headers, "refresh_token")).toMatch(/Max-Age=\d+/i);

    const rotated = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    });
    expect(rotated).toHaveLength(1);
    expect(rotated[0]!.remember).toBe(true);

    const loggedOut = await agent
      .post("/api/auth/log-out")
      .set("accept", "application/json")
      .set("x-csrf-token", token)
      .expect(200);

    expect(setCookie(loggedOut.headers, "access_token")).toMatch(/^access_token=;/);
    expect(setCookie(loggedOut.headers, "refresh_token")).toMatch(/^refresh_token=;/);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
  });

  it("reports a missing refresh token with a 401", async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const response = await agent
      .post("/api/auth/refresh")
      .set("x-csrf-token", token)
      .expect(401);

    expect(response.body).toEqual({ message: "No refresh token provided" });
  });

  it("returns JSON for unknown API routes", async () => {
    const response = await request(app).get("/api/not-a-route").expect(404);
    expect(response.body).toEqual({ message: "Not found" });
  });
});
