import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";

// Private folder, nothing serves it. Add "uploads" to .gitignore.
const UPLOAD_DIR = path.resolve("uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The extension comes from the file type, never from the user's filename
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
};

export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, randomUUID() + EXTENSIONS[file.mimetype]),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10 MB each, 5 files
  fileFilter: (_req, file, cb) => cb(null, Boolean(EXTENSIONS[file.mimetype])),
});