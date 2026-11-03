// The accent palette is a Settings value, so it can only be applied once the
// profile has loaded. "kalachuchi" is the default already declared in
// index.css, so it needs no data-theme attribute at all.
export const DEFAULT_THEME = "kalachuchi";

export function applyTheme(theme: string | null | undefined): void {
  const root = document.documentElement;
  if (!theme || theme === DEFAULT_THEME) delete root.dataset.theme;
  else root.dataset.theme = theme;
}
