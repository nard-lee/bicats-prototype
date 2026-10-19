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