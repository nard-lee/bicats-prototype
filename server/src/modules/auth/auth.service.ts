import argon2 from "argon2";

import { prisma } from "@/db.js";
import { CustomError } from "@/utils/custom.exception.js";
import auditService from "@/modules/audit/audit.service.js";
import type { LoginInput, LoginResult, RefreshResult } from "./auth.schema.js";
import { generateRefreshToken, signAccessToken } from "@/utils/jwt.js";
import { config } from "@/utils/env.config.js";

const REFRESH_TTL_MS = config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000;

// A token that was already rotated (or logged out) can only be presented by
// someone holding a stolen copy, so treat the replay as a compromise and kill
// every session for the user — the thief's successor token included.
async function rejectReplay(
  user: { id: number; fullName: string; role: string },
  ip: string | null,
): Promise<never> {
  await auditService.record({
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: "auth.token_reuse",
    entityType: "auth",
    entityId: user.id,
    summary: `${user.fullName}: possible stolen refresh token — all sessions revoked`,
    ip,
  });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  throw new CustomError('Invalid session', { refreshToken: 'Session expired, please log in again' }, 401);
}

const authService = {

  async login(request: LoginInput): Promise<LoginResult> {
    const { identifier, password } = request;
    const normalizedIdentifier = identifier.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier.toLowerCase() },
          { username: normalizedIdentifier },
          { phone: normalizedIdentifier },
        ],
      },
      select: {
        id: true,
        fullName: true,
        position: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user) throw new CustomError(
      "Invalid credentials",
      { identifier: "No account matches this email, username, or phone" },
      401,
    );

    const passwordMatches = await argon2.verify(user.passwordHash, password,);
    if (!passwordMatches) throw new CustomError(
      "Invalid credentials",
      { password: "Incorrect password" },
      401,
    );

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
        remember: request.remember,
      }
    })

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, fullName: user.fullName, role: user.role },
    };
  },

  async refresh(oldRefreshToken: string, ip: string | null = null): Promise<RefreshResult> {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: { select: { id: true, role: true, fullName: true } } },
    });

    if (!stored) throw new CustomError('Invalid session', { refreshToken: 'Invalid or expired session' }, 401);

    if (stored.revokedAt) await rejectReplay(stored.user, ip);

    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new CustomError('Invalid session', { refreshToken: 'Session expired, please log in again' }, 401);
    }

    // Rotate under a revokedAt guard so the same token can never be spent
    // twice, even by two racing requests.
    const rotated = await prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (rotated.count === 0) await rejectReplay(stored.user, ip);

    const newRefreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: stored.user.id,
        expiresAt,
        remember: stored.remember,
      },
    });

    // Tombstones only need to outlive the refresh TTL — an older replay could
    // never have been a valid cookie anyway.
    await prisma.refreshToken.deleteMany({
      where: { revokedAt: { lt: new Date(Date.now() - REFRESH_TTL_MS) } },
    });

    const accessToken = signAccessToken({ userId: stored.user.id, role: stored.user.role });
    return { accessToken, refreshToken: newRefreshToken, remember: stored.remember };
  },

  async logout(refreshToken: string): Promise<void> {
    // Tombstone instead of delete so a replay of the logged-out cookie is
    // still caught by refresh().
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

};

export default authService;