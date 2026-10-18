import argon2 from "argon2";

import { prisma } from "@/db.js";
import { CustomError } from "@/utils/custom.exception.js";
import type { AuthToken, LoginInput } from "./auth.schema.js";
import { generateRefreshToken, signAccessToken } from "@/utils/jwt.js";
import { config } from "@/utils/env.config.js";

const authService = {

  async login(request: LoginInput): Promise<AuthToken> {
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

    if (!user) throw new CustomError("Invalid credentials", { identifier: "not found" });

    const passwordMatches = await argon2.verify(user.passwordHash, password,);
    if (!passwordMatches) throw new CustomError("Invalid credentials", { password: "incorrect" });

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    })

    return { accessToken, refreshToken }
  },

  async refresh(oldRefreshToken: string): Promise<AuthToken> {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!stored) throw new CustomError('Invalid session', { refreshToken: 'Invalid or expired session' });
    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new CustomError('Invalid session', { refreshToken: 'Session expired, please log in again' });
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newRefreshToken = generateRefreshToken();
    const expiresAt = new Date(
      Date.now() + config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000
    );

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: stored.user.id,
        expiresAt,
      },
    });

    const accessToken = signAccessToken({ userId: stored.user.id, role: stored.user.role });
    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  },

};

export default authService;