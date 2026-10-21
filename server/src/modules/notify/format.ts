// SMS and email dates differ on purpose: texts stay compact to save characters,
// emails spell out the weekday.
export function formatShortWhen(date: Date): string {
  return date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export function formatLongWhen(date: Date): string {
  return date.toLocaleString("en-PH", { dateStyle: "full", timeStyle: "short" });
}
