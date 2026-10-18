import type { Request, Response } from "express"

import { CustomError } from "@/utils/custom.exception.js";
import { validateRequest } from "@/utils/custom.validator.js";
import { loginSchema } from "./auth.schema.js";
import authService from "./auth.service.js";
import { config } from "@/utils/env.config.js";
import userService from "@/modules/user/user.service.js";

const authController = {

    async me(req: Request, res: Response): Promise<void> {
        if (!req.user) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }

        try {
            const user = await userService.me(req.user.userId);
            res.status(200).json(user);
        } catch (err: unknown) {
            res.status(500).json({ error: "Internal server error" });
        }
    },

    async login(req: Request, res: Response): Promise<void> {
        try {
            const request = validateRequest(loginSchema, req.body);
            const { accessToken, refreshToken } = await authService.login(request);

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
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                res.status(400).json({ error: err.message, fields: err.fields });
                return;
            }
            res.status(500).json({ error: "Internal server error" });
        }
    },

    async refresh(req: Request, res: Response): Promise<void> {
        try {
            const oldRefreshToken = req.cookies?.refresh_token;

            if (!oldRefreshToken) {
                res.status(401).json({ error: 'No refresh token provided' });
                return;
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
        } catch (err: unknown) {
            if (err instanceof CustomError) {
                res.status(401).json({ error: err.message, fields: err.fields });
                return;
            }
            res.status(500).json({ error: "Internal server error" });
        }
    },

    async logout(req: Request, res: Response): Promise<void> {
        try {
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
        } catch (err: unknown) {
            res.status(500).json({ error: "Internal server error" });
        }
    },

}

export default authController;