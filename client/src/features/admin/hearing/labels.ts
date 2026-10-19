import type { HearingKind, HearingStatus } from "./loader";

export const KIND_LABEL: Record<HearingKind, string> = {
  mediation: "Mediation",
  conciliation: "Conciliation",
  hearing: "Arbitration",
};

export const STATUS_LABEL: Record<HearingStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export const KIND_STYLE: Record<HearingKind, string> = {
  mediation:
    "border-violet-500/20 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  conciliation:
    "border-indigo-500/20 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  hearing:
    "border-sky-500/20 bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

export const STATUS_STYLE: Record<HearingStatus, string> = {
  scheduled: "border-primary/20 bg-primary/10 text-primary",
  completed:
    "border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "border-border bg-muted text-muted-foreground",
  no_show:
    "border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-300",
};
