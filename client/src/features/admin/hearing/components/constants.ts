import type { HearingItem } from "../loader";
import { DOT_ACTION, DOT_ACTIVE, DOT_NEUTRAL } from "@/lib/status";

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

// Chip dot colors for the calendar. Finished sessions (completed or
// cancelled) recede to gray; only live and failed ones carry a color.
export const STATUS_DOT: Record<HearingItem["status"], string> = {
  scheduled: DOT_ACTIVE,
  completed: DOT_NEUTRAL,
  cancelled: DOT_NEUTRAL,
  no_show: DOT_ACTION,
};

export const PAGE_SIZE = 10;

export const pad = (value: number) => String(value).padStart(2, "0");

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
