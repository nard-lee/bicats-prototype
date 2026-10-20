export type ComplaintPriority = "none" | "low" | "normal" | "high" | "urgent";

// Highest priority first, for selectors.
export const PRIORITIES: ComplaintPriority[] = ["none", "urgent", "high", "normal", "low"];

export const PRIORITY_STYLE: Record<ComplaintPriority, string> = {
  none: "none",
  low: "border-border bg-muted text-muted-foreground",
  normal: "border-sky-500/20 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  high: "border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  urgent: "border-destructive/30 bg-destructive/15 text-destructive",
};
