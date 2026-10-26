import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import authService from "../src/modules/auth/auth.service.js";
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
    const { agent, token } = await loginAgent("staff");

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const deactivated = await agent.get("/api/auth/me").expect(401);
    expect(deactivated.body).toEqual({ message: "Account is not active" });

    // Deactivation blocks both re-authentication and session rotation.
    const freshAgent = request.agent(app);
    const freshToken = await csrfToken(freshAgent);
    const relogin = await freshAgent
      .post("/api/auth/log-in")
      .set("x-csrf-token", freshToken)
      .send({ identifier: "staff", password: PASSWORD })
      .expect(401);
    expect(relogin.body.message).toBe("Account is not active");

    const refreshed = await agent
      .post("/api/auth/refresh")
      .set("x-csrf-token", token)
      .expect(401);
    expect(refreshed.body.message).toBe("Account is not active");
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
  });

  it("revokes every session when the password changes", async () => {
    const user = await createUser("staff");
    const { agent, token } = await loginAgent("staff");

    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1);

    await agent
      .patch("/api/users/me")
      .set("x-csrf-token", token)
      .send({ password: "new-password-123" })
      .expect(200);

    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);

    const refreshed = await agent
      .post("/api/auth/refresh")
      .set("x-csrf-token", token)
      .expect(401);
    expect(refreshed.body.message).toBe("Invalid session");
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
    // Rotation tombstones the old token instead of deleting it, so replays
    // stay detectable.
    expect(storedOld!.revokedAt).toBeInstanceOf(Date);

    const tokens = await prisma.refreshToken.findMany({
      where: { userId: user.id, revokedAt: null },
    });
    expect(tokens).toHaveLength(1);

    await agent.get("/api/auth/me").expect(200);
  });

  it("revokes every session when a rotated token is replayed", async () => {
    const user = await createUser("admin");
    const first = await authService.login({
      identifier: "admin",
      password: PASSWORD,
      remember: false,
    });
    const second = await authService.refresh(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);

    // The attacker replays the original token after it was rotated: the
    // request fails and the whole family dies with it.
    await expect(authService.refresh(first.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(0);

    // The successor token the attacker would have walked away with is dead too.
    await expect(authService.refresh(second.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });

    // The compromise is visible in the audit trail, attributed to the victim.
    const entry = await prisma.auditLog.findFirst({
      where: { action: "auth.token_reuse", entityId: user.id },
    });
    expect(entry?.summary).toContain("all sessions revoked");
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
      where: { userId: user.id, revokedAt: null },
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
      where: { userId: user.id, revokedAt: null },
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
    // Logout tombstones the token (replay detection) — no active sessions left.
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } }),
    ).toBe(0);
  });

  it("bootstraps the profile for anonymous and signed-in visitors", async () => {
    const anonymous = await request(app).get("/api/auth/bootstrap").expect(200);
    expect(anonymous.body.user).toBeNull();
    expect(anonymous.body.settings).toMatchObject({
      id: 1,
      documentOfficeLine: "Office of the Punong Barangay",
    });

    await createUser("admin");
    const { agent } = await loginAgent("admin");

    const signedIn = await agent.get("/api/auth/bootstrap").expect(200);
    expect(signedIn.body.user).toMatchObject({
      email: "admin@bicats.test",
      role: "admin",
    });
    expect(signedIn.body.user.passwordHash).toBeUndefined();
    expect(signedIn.body.settings).toMatchObject({ id: 1 });
  });

  it("asks the client to refresh when only the session cookie remains", async () => {
    await createUser("staff");
    const agent = request.agent(app);
    const token = await csrfToken(agent);

    const login = await agent
      .post("/api/auth/log-in")
      .set("x-csrf-token", token)
      .send({ identifier: "staff", password: PASSWORD })
      .expect(200);

    const refresh = refreshTokenFrom(login.headers);
    expect(refresh).toBeTruthy();

    const response = await request(app)
      .get("/api/auth/bootstrap")
      .set("Cookie", [`refresh_token=${refresh}`])
      .expect(401);

    expect(response.body).toEqual({ message: "Session needs refresh" });
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
