import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { doubleCsrf } from "csrf-csrf";
import { config } from "@/utils/env.config.js";

const CSRF_SID_COOKIE = "csrf_sid";

export function ensureCsrfSession(req: Request, res: Response, next: NextFunction) {
    if (!req.cookies?.[CSRF_SID_COOKIE]) {
        const sid = randomUUID();

        res.cookie(CSRF_SID_COOKIE, sid, {
            httpOnly: true,
            secure: config.nodeEnv === "production",
            sameSite: config.nodeEnv === "production" ? "none" : "lax",
            maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        req.cookies[CSRF_SID_COOKIE] = sid;
    }
    next();
}

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => config.csrfSecret,
    getSessionIdentifier: (req) => req.cookies?.[CSRF_SID_COOKIE] ?? "anonymous",
    cookieName: config.nodeEnv === "production" ? "__Host-csrf" : "csrf_token",
    cookieOptions: {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: config.nodeEnv === "production" ? "none" : "lax",
    },
    getCsrfTokenFromRequest: (req) => 
        (req.headers["x-csrf-token"] as string | undefined) ?? (req.body?._csrf as string | undefined)
});

export { generateCsrfToken, doubleCsrfProtection };