const RECENT_KEY = "bicats:tracked-references";
const MAX_RECENT = 5;

export function loadRecentReferences(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

export function rememberReference(reference: string): string[] {
  const next = [
    reference,
    ...loadRecentReferences().filter((item) => item !== reference),
  ].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage can be denied (private mode); the list still works for this visit.
  }

  return next;
}

export function clearRecentReferences(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // Nothing to clear.
  }
}
