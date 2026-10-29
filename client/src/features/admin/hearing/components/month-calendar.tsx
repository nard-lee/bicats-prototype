import { Fragment, type Dispatch, type SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import { DOT_ACTION, STATUS_ACTION, STATUS_ACTIVE } from "@/lib/status";
import { KIND_ABBREV, KIND_LABEL } from "../labels";
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
  // Weekday down the left, weeks across, so each cell is as wide as the month
  // has weeks (5-6) instead of as wide as the week (7).
  const weekCount = Math.ceil(cells.length / 7);

  return (
    <Card className="[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle>{monthLabel}</CardTitle>
        <CardAction>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="secondary">{scheduledCount} scheduled</Badge>
            {overdueCount > 0 && (
              <Badge className={cn("border", STATUS_ACTION)}>
                {overdueCount} overdue
              </Badge>
            )}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `1.75rem repeat(${weekCount}, minmax(0, 1fr))`,
          }}
        >
          {WEEKDAYS.map((day, weekday) => (
            <Fragment key={day}>
              <div className="flex h-5 items-center text-xs font-medium text-muted-foreground">
                <span className="sm:hidden">{day[0]}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>

              {Array.from({ length: weekCount }, (_, week) => {
                const cell = cells[week * 7 + weekday];
                if (!cell) {
                  return (
                    <div
                      key={`empty-${week}`}
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
                    onMouseLeave={() =>
                      setHoveredDay((current) => (current === key ? null : current))
                    }
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
                          "hidden cursor-pointer truncate rounded border px-1.5 py-0.5 text-xs font-medium transition-colors hover:ring-1 hover:ring-foreground/25 sm:block",
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
                        <span
                          className={cn(
                            "inline-block h-1.5 w-1.5 -translate-y-px rounded-full",
                            hearing.overdue ? DOT_ACTION : STATUS_DOT[hearing.status],
                          )}
                          aria-hidden
                        />{" "}
                        {KIND_ABBREV[hearing.kind]}{" "}
                        <span className="tabular-nums">
                          {fmtTime(hearing.scheduledAt)}
                        </span>{" "}
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
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
