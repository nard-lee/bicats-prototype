import { HTTPError } from "ky";

/**
 * Server failures answer `{ message, fields? }`, and ky pre-parses that body onto
 * `HTTPError.data` (the response stream is consumed, so it cannot be re-read).
 * A validation reply is more useful for its first field issue than for its
 * generic top-level message.
 */
export function readErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HTTPError)) return fallback;

  const body = err.data as { message?: string; fields?: Record<string, string> } | undefined;
  const field = body?.fields ? Object.values(body.fields)[0] : undefined;
  const message = field ?? body?.message;

  return typeof message === "string" && message.trim() ? message.trim() : fallback;
}
