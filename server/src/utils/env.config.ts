import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: Number(requireEnv('PORT')),
  nodeEnv: requireEnv('NODE_ENV'),
  csrfSecret: requireEnv('CSRF_SECRET'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: Number(requireEnv('JWT_EXPIRES_IN')),
  databaseUrl: requireEnv('DATABASE_URL'),
  corsOrigin: requireEnv('CORS_ORIGIN'),
  refreshTokenExpiresInDays: Number(optionalEnv('REFRESH_TOKEN_EXPIRES_IN', '30')),
} as const;