import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";

import { databaseName, testDatabaseUrl } from "./env.js";

const serverRoot = path.resolve(import.meta.dirname, "..");

async function ensureDatabase(url: string): Promise<void> {
  const probe = new pg.Client({ connectionString: url });

  try {
    await probe.connect();
    await probe.end();
    return;
  } catch {
    await probe.end().catch(() => undefined);
  }

  const name = databaseName(url);
  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = "/postgres";
  maintenanceUrl.search = "";

  const adminUrls = [process.env.DATABASE_URL, maintenanceUrl.toString()].filter(
    (value): value is string => !!value,
  );

  let lastError: unknown;

  for (const adminUrl of adminUrls) {
    const admin = new pg.Client({ connectionString: adminUrl });
    try {
      await admin.connect();
    } catch (err) {
      lastError = err;
      await admin.end().catch(() => undefined);
      continue;
    }

    try {
      const existing = await admin.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [name],
      );
      if (existing.rowCount === 0) {
        await admin.query(`CREATE DATABASE "${name}"`);
      }
      return;
    } finally {
      await admin.end();
    }
  }

  throw lastError ?? new Error(`Could not create the test database "${name}".`);
}

export default async function setup(): Promise<void> {
  const url = testDatabaseUrl();

  await ensureDatabase(url);

  execFileSync(
    process.execPath,
    [
      path.resolve(serverRoot, "node_modules/prisma/build/index.js"),
      "db",
      "push",
    ],
    {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: url },
      stdio: "inherit",
    },
  );

  // Tests rely on the default barangay settings; drop any customised row.
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('TRUNCATE TABLE "BarangaySettings" CASCADE');
  } finally {
    await client.end();
  }
}
