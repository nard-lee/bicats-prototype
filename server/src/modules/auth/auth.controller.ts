import type { Request, Response } from "express"

import { CustomError } from "@/utils/custom.exception.js";
import { validateRequest } from "@/utils/custom.validator.js";
import { loginSchema } from "./auth.schema.js";
import authService from "./auth.service.js";
import { config } from "@/utils/env.config.js";
import userService from "@/modules/user/user.service.js";
import settingService from "@/modules/setting/setting.service.js";
import auditService from "@/modules/audit/audit.service.js";

const isProd = config.nodeEnv === "production";

// The client and API share an origin, so Lax keeps session cookies off
// cross-site requests without breaking anything.
const AUTH_COOKIE = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
};

function setSessionCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
    remember: boolean,
): void {
    // The access token is short-lived either way; only the refresh cookie
    // decides whether the sign-in survives a browser restart.
    res.cookie("access_token", tokens.accessToken, AUTH_COOKIE);
    res.cookie("refresh_token", tokens.refreshToken, {
        ...AUTH_COOKIE,
        ...(remember
            ? { maxAge: config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000 }
            : {}),
    });
}

const authController = {

    async me(req: Request, res: Response): Promise<void> {
        if (!req.user) {
            throw new CustomError("Not authenticated", undefined, 401);
        }

        res.status(200).json(await userService.me(req.user.userId));
    },

    async bootstrap(req: Request, res: Response): Promise<void> {
        // The access cookie is session-only, so a remembered visitor can arrive
        // holding just the refresh cookie. Answer 401 so the client rotates the
        // session and retries instead of rendering a signed-out shell.
        if (!req.user && req.cookies?.refresh_token) {
            throw new CustomError("Session needs refresh", undefined, 401);
        }

        const [user, settings] = await Promise.all([
            req.user ? userService.me(req.user.userId) : null,
            settingService.get(),
        ]);

        res.status(200).json({ user, settings });
    },

    async login(req: Request, res: Response): Promise<void> {
        const request = validateRequest(loginSchema, req.body);
        const { accessToken, refreshToken, user } = await authService.login(request);

        setSessionCookies(res, { accessToken, refreshToken }, request.remember);

        res.status(200).json({ success: true });

        await auditService.record({
            actorId: user.id,
            actorName: user.fullName,
            actorRole: user.role,
            action: "auth.login",
            entityType: "auth",
            entityId: user.id,
            summary: `${user.fullName} signed in`,
            ip: req.ip ?? null,
        });
    },

    async refresh(req: Request, res: Response): Promise<void> {
        const oldRefreshToken = req.cookies?.refresh_token;

        if (!oldRefreshToken) {
            throw new CustomError('No refresh token provided', undefined, 401);
        }

        const refreshed = await authService.refresh(oldRefreshToken, req.ip ?? null);

        setSessionCookies(res, refreshed, refreshed.remember);

        res.status(200).json({ success: true });
    },

    async logout(req: Request, res: Response): Promise<void> {
        const refreshToken = req.cookies?.refresh_token;
        if (refreshToken) await authService.logout(refreshToken);

        res.clearCookie('access_token', AUTH_COOKIE);
        res.clearCookie('refresh_token', AUTH_COOKIE);


        if (req.accepts(['html', 'json']) === 'html') {
            res.redirect('/dev');
            return;
        }


        res.status(200).json({ message: 'Logged out successfully' });
    },

}

export default authController;