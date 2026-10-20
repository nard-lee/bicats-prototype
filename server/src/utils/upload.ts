import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { ApiError } from "@/utils/api.error.js";
// Local upload folder.
const UPLOAD_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads",
);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / (1024 * 1024);

// The extension comes from the file type, never from the user's filename
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
};

const ALLOWED_TYPES = new Set(Object.keys(EXTENSIONS));
export const ALLOWED_LABEL = "JPG, PNG, PDF, MP4";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new ApiError(400, `Unsupported file type. Allowed: ${ALLOWED_LABEL}.`));
  },
});

// Turn multer's internal errors into friendly, client-safe messages.
function mapUploadError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return new ApiError(400, `Each file must be ${MAX_FILE_SIZE_MB} MB or smaller.`);
      case "LIMIT_FILE_COUNT":
        return new ApiError(400, `You can attach at most ${MAX_FILES} files.`);
      case "LIMIT_UNEXPECTED_FILE":
        return new ApiError(400, "Unexpected file field.");
    }
  }

  return new ApiError(400, "Upload failed. Please check your files and try again.");
}

// ---- Small images (logo, signatures) ----
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB
export const MAX_IMAGE_SIZE_MB = MAX_IMAGE_SIZE / (1024 * 1024);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_EXTENSIONS[file.mimetype]) {
      cb(null, true);
      return;
    }
    cb(new ApiError(400, "Unsupported image type. Allowed: JPG, PNG, WEBP."));
  },
});

async function persistFile(file: Express.Multer.File): Promise<void> {
  const extension =
    EXTENSIONS[file.mimetype] ?? IMAGE_EXTENSIONS[file.mimetype] ?? ".bin";
  const storedName = randomUUID() + extension;

  await fs.promises.writeFile(path.join(UPLOAD_DIR, storedName), file.buffer);
  file.filename = storedName;
  file.destination = UPLOAD_DIR;
  file.path = path.join(UPLOAD_DIR, storedName);
}

async function persistFiles(files?: Express.Multer.File[]): Promise<void> {
  if (!files?.length) return;
  await Promise.all(files.map((file) => persistFile(file)));
}

// Remove files from their active storage when a request ultimately fails.
export async function removeUploadedFiles(files?: Express.Multer.File[]): Promise<void> {
  if (!files?.length) return;

  await Promise.all(
    files.map(async (file) => {
      if (file.path) {
        await fs.promises.unlink(file.path).catch(() => undefined);
      }
    }),
  );
}

// Parses the "evidence" field, rejecting bad types/sizes/counts with a 400.
export function uploadEvidence(req: Request, res: Response, next: NextFunction): void {
  upload.array("evidence", MAX_FILES)(req, res, (err: unknown) => {
    if (err) {
      void removeUploadedFiles(req.files as Express.Multer.File[] | undefined);
      next(mapUploadError(err));
      return;
    }

    void persistFiles(req.files as Express.Multer.File[] | undefined)
      .then(() => next())
      .catch(async (persistError: unknown) => {
        await removeUploadedFiles(req.files as Express.Multer.File[] | undefined);
        next(
          persistError instanceof ApiError
            ? persistError
            : new ApiError(500, "Could not store uploaded files."),
        );
      });
  });
}

export function uploadImage(req: Request, res: Response, next: NextFunction): void {
  imageUpload.single("file")(req, res, (err: unknown) => {
    if (err) {
      void removeUploadedFiles(req.file ? [req.file] : undefined);
      if (err instanceof ApiError) {
        next(err);
        return;
      }
      if (err instanceof multer.MulterError) {
        next(
          new ApiError(
            400,
            err.code === "LIMIT_FILE_SIZE"
              ? `The image must be ${MAX_IMAGE_SIZE_MB} MB or smaller.`
              : "Image upload failed. Please try again.",
          ),
        );
        return;
      }
      next(new ApiError(400, "Image upload failed. Please try again."));
      return;
    }

    void persistFiles(req.file ? [req.file] : undefined)
      .then(() => next())
      .catch(async (persistError: unknown) => {
        await removeUploadedFiles(req.file ? [req.file] : undefined);
        next(
          persistError instanceof ApiError
            ? persistError
            : new ApiError(500, "Could not store the uploaded image."),
        );
      });
  });
}
