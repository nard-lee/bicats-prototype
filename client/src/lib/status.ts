// The app's whole status color budget: one ink for anything a case can still
// move on, red for what needs action now, neutral for everything already
// settled or merely informational. Stages read from their word, not their hue,
// so a screen never turns into a rainbow.
export const STATUS_ACTIVE =
  "border-status-ink/30 bg-status-ink/10 text-status-ink";
export const STATUS_NEUTRAL = "border-border bg-muted text-muted-foreground";
// A red fill behind red text costs contrast, so danger states stay unfilled.
export const STATUS_ACTION = "border-destructive/50 bg-transparent text-destructive";

export const DOT_ACTIVE = "bg-status-ink";
export const DOT_NEUTRAL = "bg-muted-foreground/60";
export const DOT_ACTION = "bg-destructive";
