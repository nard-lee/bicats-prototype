import { useMemo, useState } from "react";
import { Link, useLoaderData, useRevalidator, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";
import { useT } from "@/lib/I18n";
import HearingDialog, { type HearingDialogMode } from "./dialog";
import { KIND_LABEL, KIND_STYLE, STATUS_LABEL, STATUS_STYLE } from "./labels";
import type { HearingsData, HearingItem } from "./loader";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Module-scope so we don't call new Date() during render.
const NOW = new Date();

const pad = (value: number) => String(value).padStart(2, "0");

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export default function HearingsPage() {
  const { lang } = useT();
  const data = useLoaderData() as HearingsData;
  const revalidator = useRevalidator();
  const [, setSearchParams] = useSearchParams();

  const [dialog, setDialog] = useState<HearingDialogMode | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const locale = lang === "tl" ? "fil-PH" : "en-PH";

  const [yearStr, monthStr] = data.month.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;

  const monthLabel = new Date(year, month, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const today = NOW;
  const todayKey = dayKey(today);

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let i = -12; i <= 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      options.push({
        value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
        label: d.toLocaleDateString(locale, { month: "long", year: "numeric" }),
      });
    }
    return options;
  }, [locale, today]);

  const byDay = useMemo(() => {
    const map = new Map<string, HearingItem[]>();
    for (const hearing of data.hearings) {
      const key = dayKey(new Date(hearing.scheduledAt));
      const list = map.get(key) ?? [];
      list.push(hearing);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    }
    return map;
  }, [data.hearings]);

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(new Date(year, month, d));
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [year, month]);

  const scheduledCount = data.hearings.filter((h) => h.status === "scheduled").length;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { dateStyle: "medium" });

  const go = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setSearchParams({ month: `${d.getFullYear()}-${pad(d.getMonth() + 1)}` });
  };

  const goToday = () => {
    setSearchParams({ month: `${today.getFullYear()}-${pad(today.getMonth() + 1)}` });
  };

  const refresh = () => revalidator.revalidate();

  const createOn = (date: Date) => {
    if (data.complaints.length === 0) return;
    setDialog({ type: "create", date });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Mediation</h1>
          <p className="text-sm text-muted-foreground">
            Schedule and track mediation, conciliation, and arbitration sessions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select
            value={data.month}
            onValueChange={(value) => setSearchParams({ month: value })}
          >
            <SelectTrigger size="sm" className="w-[180px]" aria-label="Month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button onClick={() => createOn(today)} disabled={data.complaints.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> New mediation
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>{monthLabel}</CardTitle>
          <Badge variant="secondary">{scheduledCount} scheduled</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-1 pb-1 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {cells.map((cell, index) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-24 rounded-md border border-dashed border-transparent"
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
                  onClick={() => createOn(cell)}
                  onMouseEnter={() => setHoveredDay(key)}
                  onMouseLeave={() => setHoveredDay((current) => (current === key ? null : current))}
                  disabled={data.complaints.length === 0}
                  className={cn(
                    "relative flex min-h-24 flex-col items-stretch gap-1 rounded-md border p-1.5 text-left align-top transition-all",
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
                    <span className="pointer-events-none absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
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
                        setDialog({ type: "edit", hearing });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          setDialog({ type: "edit", hearing });
                        }
                      }}
                      className={cn(
                        "cursor-pointer truncate rounded border px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:ring-1 hover:ring-foreground/25",
                        KIND_STYLE[hearing.kind],
                        hearing.status === "cancelled" && "line-through opacity-60",
                      )}
                    >
                      <span className="tabular-nums">{fmtTime(hearing.scheduledAt)}</span>{" "}
                      {hearing.reference}
                    </span>
                  ))}

                  {!isHovered && items.length > 2 && (
                    <span className="px-1 text-[11px] text-muted-foreground">
                      +{items.length - 2} more
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This month</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {data.hearings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Clock className="size-5" />
              </div>
              <p className="text-sm text-muted-foreground">
                No mediation scheduled this month.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">When</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Parties</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="px-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.hearings.map((hearing) => (
                  <TableRow key={hearing.id}>
                    <TableCell className="px-6 tabular-nums">
                      {fmtDate(hearing.scheduledAt)} · {fmtTime(hearing.scheduledAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/complaints/${hearing.complaintId}`}
                        className="text-lg font-semibold tracking-wide transition-colors hover:text-primary"
                      >
                        {hearing.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                      {hearing.complainantName} and {hearing.respondentName}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border", KIND_STYLE[hearing.kind])}>
                        {KIND_LABEL[hearing.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border", STATUS_STYLE[hearing.status])}>
                        {STATUS_LABEL[hearing.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {hearing.location ?? "—"}
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialog({ type: "edit", hearing })}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialog && (
        <HearingDialog
          key={dialog.type === "edit" ? `e-${dialog.hearing.id}` : `c-${dialog.date.toISOString()}`}
          mode={dialog}
          complaints={data.complaints}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
