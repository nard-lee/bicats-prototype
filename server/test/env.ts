import "dotenv/config";

function nameOf(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

// Never let the suite point at the development database: the tests truncate
// tables, so the target must be a dedicated database whose name ends in "_test".
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL?.trim();
  const base = explicit || process.env.DATABASE_URL?.trim();

  if (!base) {
    throw new Error(
      "Set TEST_DATABASE_URL (or DATABASE_URL) before running the tests.",
    );
  }

  const url = new URL(base);
  const name = nameOf(url);

  if (!name) throw new Error("The database URL has no database name.");

  if (explicit) {
    if (!name.endsWith("_test")) {
      throw new Error(
        `Refusing to run tests against "${name}": TEST_DATABASE_URL must end with "_test".`,
      );
    }
    return url.toString();
  }

  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Unsupported database name "${name}".`);
  }

  url.pathname = `/${name}_test`;
  return url.toString();
}

export function databaseName(url: string): string {
  return nameOf(new URL(url));
}
