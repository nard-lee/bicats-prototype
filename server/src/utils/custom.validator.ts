import type { ZodType, output } from "zod";
import { CustomError } from "./custom.exception.js";

export function validateRequest<S extends ZodType>(schema: S, data: unknown): output<S> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fields: Record<string, string> = {};

    for (const issue of result.error.issues) {
      const key = issue.path.length ? issue.path.join(".") : "_root";
      if (!(key in fields)) fields[key] = issue.message;
    }

    throw new CustomError("Validation failed", fields);
  }

  return result.data;
}