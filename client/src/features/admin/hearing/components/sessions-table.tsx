import { Clock } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataPagination from "@/components/data-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";
import { STATUS_ACTION, STATUS_NEUTRAL } from "@/lib/status";
import {
  ATTENDANCE_DOT,
  attendanceSummary,
  KIND_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
} from "../labels";
import type { HearingItem } from "../loader";
import { EMPTY_MESSAGE, PAGE_SIZE, VIEW_LABEL, type HearingView } from "./constants";

type SessionsTableProps = {
  activeView: HearingView;
  rows: HearingItem[];
  visibleRows: HearingItem[];
  currentPage: number;
  totalPages: number;
  fmtDate: (iso: string) => string;
  fmtTime: (iso: string) => string;
  onAttendance: (hearing: HearingItem) => void;
  onEdit: (hearing: HearingItem) => void;
  onPageChange: (page: number) => void;
};

export default function SessionsTable({
  activeView,
  rows,
  visibleRows,
  currentPage,
  totalPages,
  fmtDate,
  fmtTime,
  onAttendance,
  onEdit,
  onPageChange,
}: SessionsTableProps) {
  return (
    <div className="space-y-2 lg:[&>[data-slot=table-container]]:overflow-visible">
      <p className="px-4 text-sm text-muted-foreground tabular-nums sm:px-6">
        {VIEW_LABEL[activeView]} · {rows.length}{" "}
        {rows.length === 1 ? "session" : "sessions"}
      </p>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Clock className="size-5" />
          </div>
          <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE[activeView]}</p>
        </div>
      ) : (
        <Table>
          {/* The page control row is the top sticky band, so these headers pin
              directly under it (52px = the row's height less the scroller's
              own padding). Only from lg: below that the table is wider than
              the page and keeps its own horizontal scroll instead. */}
          <TableHeader className="z-10 bg-background lg:sticky lg:top-[52px] lg:[&_th]:py-2">
            <TableRow>
              <TableHead className="pl-4 sm:pl-6">Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Case</TableHead>
              <TableHead>Parties</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead className="hidden 2xl:table-cell">Location</TableHead>
              <TableHead className="pr-4 text-right sm:pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((hearing) => {
              const attendance = attendanceSummary(
                hearing.complainantAttendance,
                hearing.respondentAttendance,
              );

              return (
                <TableRow key={hearing.id}>
                  <TableCell className="pl-4 sm:pl-6">
                    {fmtDate(hearing.scheduledAt)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {fmtTime(hearing.scheduledAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/admin/complaints/${hearing.complaintId}`}
                      className="text-sm font-semibold tracking-wide transition-colors hover:text-primary dark:hover:text-status-ink"
                    >
                      {hearing.reference}
                    </Link>
                  </TableCell>
                  {/* Wraps rather than truncates: the pair is the only cell
                      wide enough to force the sticky header sideways. */}
                  <TableCell className="max-w-[16rem] whitespace-normal text-muted-foreground">
                    {hearing.complainantName} and {hearing.respondentName}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge className={cn("border", STATUS_NEUTRAL)}>
                      {KIND_LABEL[hearing.kind]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "border",
                        hearing.overdue ? STATUS_ACTION : STATUS_STYLE[hearing.status],
                      )}
                    >
                      {hearing.overdue ? "Overdue" : STATUS_LABEL[hearing.status]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground"
                    title={`Complainant: ${hearing.complainantAttendance ?? "not recorded"} · Respondent: ${hearing.respondentAttendance ?? "not recorded"}`}
                  >
                    {attendance ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            ATTENDANCE_DOT[attendance.tone],
                          )}
                        />
                        {attendance.text}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground 2xl:table-cell">
                    {hearing.location ?? "—"}
                  </TableCell>
                  <TableCell className="pr-4 text-right sm:pr-6">
                    <div className="flex justify-end gap-2">
                      {hearing.status !== "cancelled" &&
                        hearing.started &&
                        !["settled", "certified", "dismissed"].includes(
                          hearing.complaintStatus,
                        ) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAttendance(hearing)}
                          >
                            Attendance
                          </Button>
                        )}
                      <Button variant="outline" size="sm" onClick={() => onEdit(hearing)}>
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {activeView === "month" && rows.length > 0 && (
        <div className="flex justify-end px-4 sm:px-6">
          <DataPagination
            page={currentPage}
            totalPages={totalPages}
            total={rows.length}
            pageSize={PAGE_SIZE}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
