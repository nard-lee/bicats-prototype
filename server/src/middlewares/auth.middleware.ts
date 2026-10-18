import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JwtPayload } from "@/utils/jwt.js";
import { ApiError } from "@/utils/api.error.js";
import { prisma } from "@/db.js";

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export function requireAuth(...allowedRoles: JwtPayload["role"][]) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const token = req.cookies?.access_token;

        if (!token) {
            next(new ApiError(401, "Missing access token"));
            return;
        }

        let payload: JwtPayload;

        try {
            payload = verifyAccessToken(token);
        } catch (err: unknown) {
            const isExpired =
                err instanceof Error && err.name === "TokenExpiredError";

            next(
                new ApiError(
                    401,
                    isExpired ? "Token expired" : "Invalid token",
                ),
            );
            return;
        }

        try {
            // Re-check against the DB so role changes and deactivations take
            // effect immediately instead of waiting for the token to expire.
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, role: true, isActive: true },
            });

            if (!user || !user.isActive) {
                next(new ApiError(401, "Account is not active"));
                return;
            }

            req.user = { userId: user.id, role: user.role };

            if (
                allowedRoles.length > 0 &&
                !allowedRoles.includes(user.role)
            ) {
                next(new ApiError(403, "Insufficient permissions"));
                return;
            }

            next();
        } catch (err: unknown) {
            next(err as Error);
        }
    };
}
