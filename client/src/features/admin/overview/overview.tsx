import { Link, useLoaderData } from "react-router";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT, type Key } from "@/lib/I18n";
import type { Overview } from "./loader";

const STATUS_ORDER = [
  "received",
  "summoned",
  "mediation",
  "conciliation",
  "settled",
  "certified",
  "dismissed",
] as const;

export default function AdminOverview() {
  const { t, lang } = useT();
  const data = useLoaderData() as Overview;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
    });

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const stats = [
    {
      label: "Total Complaints",
      value: data.totals.complaints,
      icon: ClipboardList,
    },
    { label: "Open Cases", value: data.totals.open, icon: FolderOpen },
    {
      label: "Overdue Cases",
      value: data.totals.overdue,
      icon: AlertTriangle,
    },
    { label: "Settled", value: data.totals.settled, icon: CheckCircle2 },
    {
      label: "Published Notices",
      value: `${data.totals.publishedNotices}/${data.totals.notices}`,
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("adminOverview")}</h1>
        <p className="text-sm text-muted-foreground">
          A snapshot of complaints, hearings and notices.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent complaints */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Complaints</CardTitle>
            <Link
              to="/admin/complaints"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentComplaints.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No complaints filed yet.
              </p>
            ) : (
              <div className="divide-y">
                {data.recentComplaints.map((complaint) => (
                  <Link
                    key={complaint.id}
                    to={`/admin/complaints/${complaint.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {complaint.reference}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {complaint.complainantName} vs {complaint.respondentName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">
                        {t(`st_${complaint.status}` as Key)}
                      </Badge>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {formatDate(complaint.createdAt)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Upcoming hearings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Upcoming Hearings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.upcomingHearings.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hearings scheduled.
                </p>
              ) : (
                <div className="divide-y">
                  {data.upcomingHearings.map((hearing) => (
                    <div key={hearing.id} className="flex items-start gap-3 py-3">
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {formatDateTime(hearing.hearingAt)}
                        </p>
                        {hearing.complaint && (
                          <Link
                            to={`/admin/complaints/${hearing.complaint.id}`}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            {hearing.complaint.reference} ·{" "}
                            {hearing.complaint.complainantName}
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>By Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STATUS_ORDER.map((status) => (
                <div
                  key={status}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {t(`st_${status}` as Key)}
                  </span>
                  <span className="font-medium">
                    {data.statusCounts[status] ?? 0}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
