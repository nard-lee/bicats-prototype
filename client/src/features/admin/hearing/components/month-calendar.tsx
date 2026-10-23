import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import { KIND_STYLE, OVERDUE_STYLE } from "../labels";
import type { HearingItem } from "../loader";
import { STATUS_DOT, WEEKDAYS, dayKey } from "./constants";

type MonthCalendarProps = {
  monthLabel: string;
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
  monthLabel,
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
    <Card className="[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle>{monthLabel}</CardTitle>
        <CardAction>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="secondary">{scheduledCount} scheduled</Badge>
            {overdueCount > 0 && (
              <Badge className={cn("border", OVERDUE_STYLE)}>
                {overdueCount} overdue
              </Badge>
            )}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-1 pb-1 text-center text-[10px] font-medium text-muted-foreground sm:text-xs"
            >
              {day}
            </div>
          ))}

          {cells.map((cell, index) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-14 rounded-md border border-dashed border-transparent sm:min-h-24"
                />
              );
            }

            const key = dayKey(cell);
            const items = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            const isBusy = items.length >= 2;
            const isHovered = hoveredDay === key;
            const visible = isBusy && isHovered ? items : items.slice(0, 2);

            return (
              <button
                key={key}
                type="button"
                onClick={() => onCreate(cell)}
                onMouseEnter={() => setHoveredDay(key)}
                onMouseLeave={() => setHoveredDay((current) => (current === key ? null : current))}
                disabled={!complaintsAvailable}
                className={cn(
                  "relative flex min-h-14 flex-col items-stretch gap-1 rounded-md border p-1 text-left align-top transition-all sm:min-h-24 sm:p-1.5",
                  "hover:border-primary/40 hover:bg-muted/40 disabled:cursor-default",
                  isToday ? "border-primary/50 bg-primary/5" : "border-border",
                  isBusy &&
                    "hover:z-10 hover:ring-2 hover:ring-primary/40 hover:shadow-sm",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {cell.getDate()}
                </span>

                {isBusy && (
                  <span className="pointer-events-none absolute top-1 right-1 hidden h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground sm:flex">
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
                      "hidden cursor-pointer truncate rounded border px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:ring-1 hover:ring-foreground/25 sm:block",
                      KIND_STYLE[hearing.kind],
                      hearing.status === "cancelled" && "line-through opacity-60",
                      hearing.overdue && "border-amber-500/60 ring-1 ring-amber-500/40",
                    )}
                    title={
                      hearing.overdue
                        ? `${fmtTime(hearing.scheduledAt)} ${hearing.reference} — Overdue: no outcome recorded`
                        : `${fmtTime(hearing.scheduledAt)} ${hearing.reference}`
                    }
                  >
                    <span
                      className={cn(
                        "inline-block h-1.5 w-1.5 -translate-y-px rounded-full",
                        hearing.overdue ? "bg-amber-500" : STATUS_DOT[hearing.status],
                      )}
                      aria-hidden
                    />{" "}
                    <span className="tabular-nums">{fmtTime(hearing.scheduledAt)}</span>{" "}
                    {hearing.reference}
                  </span>
                ))}

                {items.length > 0 && (
                  <span className="mt-auto flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                    {items.map((hearing) => (
                      <span
                        key={hearing.id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          hearing.overdue ? "bg-amber-500" : STATUS_DOT[hearing.status],
                          hearing.status === "cancelled" && "opacity-50",
                        )}
                      />
                    ))}
                  </span>
                )}

                {!isHovered && items.length > 2 && (
                  <span className="hidden px-1 text-[11px] text-muted-foreground sm:block">
                    +{items.length - 2} more
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
