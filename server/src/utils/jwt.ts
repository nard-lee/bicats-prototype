import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '@/utils/env.config.js';

export interface JwtPayload {
  userId: number;
  role: string;
  fullName?: string;
}
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

// Refresh tokens are stored as a digest, so a database dump yields strings
// that cannot be spent. SHA-256 is enough here because the token is 40 random
// bytes: unlike a password there is no dictionary to search, so nothing is
// gained by a slow hash.
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
