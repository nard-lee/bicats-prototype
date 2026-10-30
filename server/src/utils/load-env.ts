import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, "..", "..");
const repoRoot = path.resolve(serverDir, "..");

// Resolved from this file rather than from the shell's current directory, so a
// command reads the same values whether it runs from the repo root or from
// server/. Order matters: server/.env owns the app's settings, and the repo-root
// .env.local — where `neon env pull` writes the branch's object-storage
// credentials — only fills the keys server/.env leaves unset. dotenv never
// overwrites a variable that is already set, so a cloud connection string can
// not silently replace the local one.
for (const file of [
  path.join(serverDir, ".env"),
  path.join(repoRoot, ".env.local"),
]) {
  if (existsSync(file)) dotenv.config({ path: file, quiet: true });
}
