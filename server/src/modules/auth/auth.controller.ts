import type { Request, Response } from "express"

import { CustomError } from "@/utils/custom.exception.js";
import { validateRequest } from "@/utils/custom.validator.js";
import { loginSchema } from "./auth.schema.js";
import authService from "./auth.service.js";
import { config } from "@/utils/env.config.js";
import userService from "@/modules/user/user.service.js";
import auditService from "@/modules/audit/audit.service.js";

const authController = {

    async me(req: Request, res: Response): Promise<void> {
        if (!req.user) {
            throw new CustomError("Not authenticated", undefined, 401);
        }

        res.status(200).json(await userService.me(req.user.userId));
    },

    async login(req: Request, res: Response): Promise<void> {
        const request = validateRequest(loginSchema, req.body);
        const { accessToken, refreshToken, user } = await authService.login(request);

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
            maxAge: config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000
        })

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

        const { accessToken, refreshToken } = await authService.refresh(oldRefreshToken);

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
            maxAge: config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({ success: true });
    },

    async logout(req: Request, res: Response): Promise<void> {
        const refreshToken = req.cookies?.refresh_token;
        if (refreshToken) await authService.logout(refreshToken);

        res.clearCookie('access_token', {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
        });

        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
        });


        if (req.accepts(['html', 'json']) === 'html') {
            res.redirect('/dev');
            return;
        }


        res.status(200).json({ message: 'Logged out successfully' });
    },

}

export default authController;