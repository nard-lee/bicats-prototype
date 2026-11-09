import { type Dispatch, type SetStateAction } from "react";
import { cn } from "cn";
import { DOT_ACTION, STATUS_ACTIVE } from "@/lib/status";
import { KIND_ABBREV, KIND_LABEL } from "../labels";
import type { HearingItem } from "../loader";
import { STATUS_DOT, WEEKDAYS, dayKey } from "./constants";

type MonthCalendarProps = {
  scheduledCount: number;
  overdueCount: number;
  cells: (Date | null)[];
  byDay: Map<string, HearingItem[]>;
  todayKey: string;
  hoveredDay: string | null;
  setHoveredDay: Dispatch<SetStateAction<string | null>>;
  complaintsAvailable: boolean;
  fmtTime: (iso: string) => string;
  onCreate: (date: Date) => void;
  onEdit: (hearing: HearingItem) => void;
};

export default function MonthCalendar({
  scheduledCount,
  overdueCount,
  cells,
  byDay,
  todayKey,
  hoveredDay,
  setHoveredDay,
  complaintsAvailable,
  fmtTime,
  onCreate,
  onEdit,
}: MonthCalendarProps) {
  return (
    <div className="space-y-2">
      <p className="px-4 text-sm text-muted-foreground tabular-nums sm:px-6">
        {scheduledCount} scheduled
        {overdueCount > 0 && (
          <span className="text-destructive"> · {overdueCount} overdue</span>
        )}
      </p>

      {/* Weeks run down the page at their own height and the month simply
          gets tall; the page scroller carries it, not an inner one. */}
      <div>
        {/* The page control row is the top sticky band, so these labels pin
            directly under it instead of at the scroll edge. */}
        <div className="top-[52px] sticky z-20 bg-background pb-1 pt-2">
          <div className="grid grid-cols-7 gap-1 px-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-1 py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 px-2">
          {cells.map((cell, index) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-14 rounded-md border border-dashed border-transparent sm:min-h-28"
                />
              );
            }

            const key = dayKey(cell);
            const items = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            // dayKey is zero-padded ISO, so the string compare is the date compare.
            const isPast = key < todayKey;
            const isBusy = items.length >= 2;
            const isHovered = hoveredDay === key;
            const visible = isBusy && isHovered ? items : items.slice(0, 2);

            return (
              <button
                key={key}
                type="button"
                onClick={() => onCreate(cell)}
                onMouseEnter={() => setHoveredDay(key)}
                onMouseLeave={() =>
                  setHoveredDay((current) => (current === key ? null : current))
                }
                disabled={!complaintsAvailable}
                className={cn(
                  "relative flex min-h-14 flex-col items-stretch gap-1 rounded-md border p-1 text-left align-top transition-all sm:min-h-28 sm:p-1.5",
                  "hover:border-primary/40 hover:bg-primary/5 disabled:cursor-default dark:hover:bg-primary/15",
                  isToday
                    ? "border-primary/50 bg-primary/5"
                    : isPast
                      ? "border-border/60"
                      : "border-border",
                  // Busy days still need to paint above their neighbours when
                  // the list expands; the hover edge is the plain border.
                  isBusy && "hover:z-10",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : isPast
                        ? "text-muted-foreground"
                        : "font-medium text-foreground",
                  )}
                >
                  {cell.getDate()}
                </span>

                {isBusy && (
                  <span className="pointer-events-none absolute top-1 right-1 hidden h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground sm:flex">
                    {items.length}
                  </span>
                )}

                {visible.map((hearing) => (
                  <span
                    key={hearing.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(hearing);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        e.preventDefault();
                        onEdit(hearing);
                      }
                    }}
                    className={cn(
                      "hidden cursor-pointer flex-col rounded border px-1.5 py-0.5 text-left text-xs font-medium transition-colors hover:ring-1 hover:ring-foreground/25 sm:flex",
                      // One ink for a session still to come; finished ones recede.
                      hearing.status === "completed" || hearing.status === "cancelled"
                        ? "border-border bg-muted/60 text-muted-foreground"
                        : STATUS_ACTIVE,
                      hearing.status === "cancelled" && "line-through opacity-60",
                      hearing.overdue &&
                        "border-destructive/60 ring-1 ring-destructive/40",
                    )}
                    title={
                      hearing.overdue
                        ? `${KIND_LABEL[hearing.kind]} ${fmtTime(hearing.scheduledAt)} ${hearing.reference} — Overdue: no outcome recorded`
                        : `${KIND_LABEL[hearing.kind]} ${fmtTime(hearing.scheduledAt)} ${hearing.reference}`
                    }
                  >
                    {/* Two lines: a single one clipped the case reference off
                        every chip at the width the month actually renders at. */}
                    <span className="flex items-center gap-1 leading-snug">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          hearing.overdue ? DOT_ACTION : STATUS_DOT[hearing.status],
                        )}
                        aria-hidden
                      />
                      {KIND_ABBREV[hearing.kind]}
                      <span className="tabular-nums">
                        {fmtTime(hearing.scheduledAt)}
                      </span>
                    </span>
                    <span className="truncate pl-2.5 leading-snug tabular-nums">
                      {hearing.reference}
                    </span>
                  </span>
                ))}

                {items.length > 0 && (
                  <span className="mt-auto flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                    {items.map((hearing) => (
                      <span
                        key={hearing.id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          hearing.overdue ? DOT_ACTION : STATUS_DOT[hearing.status],
                          hearing.status === "cancelled" && "opacity-50",
                        )}
                      />
                    ))}
                  </span>
                )}

                {!isHovered && items.length > 2 && (
                  <span className="hidden px-1 text-xs text-muted-foreground sm:block">
                    +{items.length - 2} more
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
