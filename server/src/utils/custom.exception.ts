export class CustomError extends Error {
  readonly fields?: Record<string, string>;
  readonly statusCode: number;

  constructor(message: string, fields?: Record<string, string>, statusCode = 400) {
    super(message);
    this.name = "CustomError";
    this.statusCode = statusCode;
    if (fields !== undefined) this.fields = fields;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}