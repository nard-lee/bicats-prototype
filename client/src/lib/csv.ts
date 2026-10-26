// Spreadsheet apps run any cell that starts with a formula character, so
// public input like a complainant name can execute on export. Prefixing those
// cells with an apostrophe keeps them inert while preserving the text.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
