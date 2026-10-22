import { useMemo, useState } from "react";
import { useLoaderData, useRevalidator, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/I18n";
import AttendanceDialog from "./attendance-dialog";
import MonthCalendar from "./components/month-calendar";
import SessionsTable from "./components/sessions-table";
import ViewSwitch from "./components/view-switch";
import { PAGE_SIZE, dayKey, pad, type HearingView } from "./components/constants";
import HearingDialog, { type HearingDialogMode } from "./dialog";
import type { HearingsData, HearingItem } from "./loader";

// Module-scope so we don't call new Date() during render.
const NOW = new Date();

export default function HearingsPage() {
  const { lang } = useT();
  const data = useLoaderData() as HearingsData;
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();

  const [dialog, setDialog] = useState<HearingDialogMode | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<HearingItem | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const locale = lang === "tl" ? "fil-PH" : "en-PH";

  const [yearStr, monthStr] = data.month.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;

  const requestedView = searchParams.get("view");
  const activeView: HearingView =
    requestedView === "overdue" || requestedView === "upcoming" || requestedView === "week"
      ? requestedView
      : "month";

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
  const overdueCount = data.hearings.filter((h) => h.overdue).length;

  const viewCounts: Record<HearingView, number> = {
    month: data.hearings.length,
    overdue: data.overdue.length,
    upcoming: data.upcoming.length,
    week: data.week.length,
  };

  const rows =
    activeView === "overdue"
      ? data.overdue
      : activeView === "upcoming"
        ? data.upcoming
        : activeView === "week"
          ? data.week
          : data.hearings;

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows =
    activeView === "month"
      ? rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
      : rows;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { dateStyle: "medium" });

  const go = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    const params = new URLSearchParams(searchParams);
    params.set("month", `${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    setSearchParams(params);
    setPage(1);
  };

  const goToday = () => {
    const params = new URLSearchParams(searchParams);
    params.set("month", `${today.getFullYear()}-${pad(today.getMonth() + 1)}`);
    setSearchParams(params);
    setPage(1);
  };

  const setView = (view: HearingView) => {
    const params = new URLSearchParams(searchParams);
    if (view === "month") params.delete("view");
    else params.set("view", view);
    setSearchParams(params);
    setPage(1);
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
            Sessions past their date without a recorded outcome are flagged overdue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeView === "month" && (
            <>
              <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select
                value={data.month}
                onValueChange={(value) => {
                  const params = new URLSearchParams(searchParams);
                  params.set("month", value);
                  setSearchParams(params);
                  setPage(1);
                }}
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
            </>
          )}
          <Button onClick={() => createOn(today)} disabled={data.complaints.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> New mediation
          </Button>
        </div>
      </div>

      <ViewSwitch activeView={activeView} viewCounts={viewCounts} onViewChange={setView} />

      {activeView === "month" && (
        <MonthCalendar
          monthLabel={monthLabel} scheduledCount={scheduledCount}
          overdueCount={overdueCount} cells={cells}
          byDay={byDay} todayKey={todayKey}
          hoveredDay={hoveredDay} setHoveredDay={setHoveredDay}
          complaintsAvailable={data.complaints.length > 0} fmtTime={fmtTime}
          onCreate={createOn} onEdit={(hearing) => setDialog({ type: "edit", hearing })}
        />
      )}

      <SessionsTable
        activeView={activeView} rows={rows}
        visibleRows={visibleRows} currentPage={currentPage}
        totalPages={totalPages}
        fmtDate={fmtDate} fmtTime={fmtTime}
        onAttendance={setAttendanceFor}
        onEdit={(hearing) => setDialog({ type: "edit", hearing })}
        onPageChange={setPage}
      />

      {dialog && (
        <HearingDialog
          key={dialog.type === "edit" ? `e-${dialog.hearing.id}` : `c-${dialog.date.toISOString()}`}
          mode={dialog}
          complaints={data.complaints}
          settings={data.settings}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}

      {attendanceFor && (
        <AttendanceDialog
          key={attendanceFor.id}
          hearing={attendanceFor}
          onClose={() => setAttendanceFor(null)}
          onSaved={() => {
            setAttendanceFor(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
