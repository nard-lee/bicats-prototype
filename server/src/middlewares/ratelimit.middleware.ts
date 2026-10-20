import rateLimit from 'express-rate-limit';
import { ApiError } from '@/utils/api.error.js';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new ApiError(429, "Too many attempts, please try again later"));
    },
});

// Public complaint filing — bounded because each submission writes uploads.
export const fileComplaintLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new ApiError(429, "Too many submissions from this network, please try again later"));
    },
});

// Public complaint tracking — stricter limit to deter reference brute-forcing.
export const trackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new ApiError(429, "Too many tracking attempts, please try again later"));
    },
});
