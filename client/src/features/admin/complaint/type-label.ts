import type { Key } from "@/lib/I18n";

export function complaintTypeLabel(
  type: string,
  other: string | null | undefined,
  t: (key: Key) => string,
): string {
  if (type === "type12" && other) return `${t("type12")}: ${other}`;
  return t(type as Key);
}
