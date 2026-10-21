import type { HearingItem } from "../loader";

export type HearingView = "month" | "overdue" | "upcoming" | "week";

export const VIEWS: HearingView[] = ["month", "overdue", "upcoming", "week"];

export const VIEW_LABEL: Record<HearingView, string> = {
  month: "This month",
  overdue: "Overdue",
  upcoming: "Upcoming",
  week: "This week",
};

export const EMPTY_MESSAGE: Record<HearingView, string> = {
  month: "No mediation scheduled this month.",
  overdue: "No overdue mediations.",
  upcoming: "Nothing scheduled ahead.",
  week: "No sessions in the next 7 days.",
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Chip dot colors for the calendar, mirroring STATUS_STYLE in labels.ts
// (dots instead of full badges because chips are only ~11px tall).
export const STATUS_DOT: Record<HearingItem["status"], string> = {
  scheduled: "bg-primary",
  completed: "bg-emerald-500",
  cancelled: "bg-muted-foreground",
  no_show: "bg-red-500",
};

export const PAGE_SIZE = 10;

export const pad = (value: number) => String(value).padStart(2, "0");

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
