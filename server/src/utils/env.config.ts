import './load-env.js';
import { storageEnabled } from './storage.js';

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
  // SMS is optional: when the secret is blank, no messages are sent.
  unismsSecretKey: optionalEnv('UNISMS_SECRET_KEY', ''),
  unismsSenderId: optionalEnv('UNISMS_SENDER_ID', 'KABAYANIHAN'),
  unismsApiUrl: optionalEnv('UNISMS_API_URL', 'https://unismsapi.com/api/sms'),
  // Email is optional: when the key is blank, no messages are sent.
  brevoApiKey: optionalEnv('BREVO_API_KEY', ''),
  brevoSenderEmail: optionalEnv('BREVO_SENDER_EMAIL', ''),
  brevoSenderName: optionalEnv('BREVO_SENDER_NAME', 'Barangay Kabayanihan'),
  brevoApiUrl: optionalEnv('BREVO_API_URL', 'https://api.brevo.com/v3/smtp/email'),
} as const;

// Host filesystems are disposable — a redeploy wipes server/uploads — so
// evidence would be written to storage that outlives no restart. Refuse to
// boot rather than accept uploads that are scheduled to disappear.
if (config.nodeEnv === "production" && !storageEnabled()) {
  throw new Error(
    "Object storage is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3 and STORAGE_BUCKET before running in production.",
  );
}
