import { Clock } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ATTENDANCE_DOT,
  attendanceSummary,
  KIND_LABEL,
  KIND_STYLE,
  OVERDUE_STYLE,
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {VIEW_LABEL[activeView]}
          <Badge variant="secondary">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Clock className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE[activeView]}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">When</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Parties</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Location</TableHead>
                <TableHead className="px-6 text-right">Actions</TableHead>
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
                    <TableCell className="px-6">
                      <p className="whitespace-nowrap">
                        {fmtDate(hearing.scheduledAt)}
                      </p>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {fmtTime(hearing.scheduledAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/complaints/${hearing.complaintId}`}
                        className="text-sm font-semibold tracking-wide transition-colors hover:text-primary"
                      >
                        {hearing.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <p className="max-w-[16rem] truncate">
                        {hearing.complainantName} and {hearing.respondentName}
                      </p>
                      {attendance && (
                        <p
                          className="mt-1 flex items-center gap-1.5 text-sm"
                          title={`Complainant: ${hearing.complainantAttendance ?? "not recorded"} · Respondent: ${hearing.respondentAttendance ?? "not recorded"}`}
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              ATTENDANCE_DOT[attendance.tone],
                            )}
                          />
                          {attendance.text}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge className={cn("border", KIND_STYLE[hearing.kind])}>
                        {KIND_LABEL[hearing.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border",
                          hearing.overdue
                            ? OVERDUE_STYLE
                            : STATUS_STYLE[hearing.status],
                        )}
                      >
                        {hearing.overdue ? "Overdue" : STATUS_LABEL[hearing.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      {hearing.location ?? "—"}
                    </TableCell>
                    <TableCell className="px-6 text-right">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(hearing)}
                        >
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
      </CardContent>
      {activeView === "month" && rows.length > 0 && (
        <CardFooter className="justify-end">
          <DataPagination
            page={currentPage}
            totalPages={totalPages}
            total={rows.length}
            pageSize={PAGE_SIZE}
            onPageChange={onPageChange}
          />
        </CardFooter>
      )}
    </Card>
  );
}
