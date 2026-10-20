import { Link, useLoaderData } from "react-router";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
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

const STATUS_DOT: Record<string, string> = {
  received: "bg-sky-500",
  summoned: "bg-amber-500",
  mediation: "bg-violet-500",
  conciliation: "bg-indigo-500",
  settled: "bg-emerald-500",
  certified: "bg-teal-500",
  dismissed: "bg-rose-500",
};

const NOW = new Date();

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

  const today = NOW.toLocaleDateString(
    lang === "tl" ? "fil-PH" : "en-PH",
    { dateStyle: "full" },
  );

  const stats = [
    {
      label: "Total Complaints",
      value: data.totals.complaints,
      icon: ClipboardList,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Open Cases",
      value: data.totals.open,
      icon: FolderOpen,
      tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Overdue Cases",
      value: data.totals.overdue,
      icon: AlertTriangle,
      tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    {
      label: "Due Soon",
      value: data.totals.atRisk,
      icon: Timer,
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Settled",
      value: data.totals.settled,
      icon: CheckCircle2,
      tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Published Notices",
      value: `${data.totals.publishedNotices}/${data.totals.notices}`,
      icon: Bell,
      tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
  ];

  const statusTotal =
    STATUS_ORDER.reduce((sum, s) => sum + (data.statusCounts[s] ?? 0), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {t("adminOverview")}
          </h1>
          <p className="text-sm text-muted-foreground">
            A snapshot of complaints, mediation and notices.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{today}</span>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card
            key={label}
            size="sm"
            className="transition-shadow hover:shadow-md hover:ring-primary/20"
          >
            <CardContent className="flex flex-row items-center gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  tone,
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl leading-none font-semibold tabular-nums">
                  {value}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Recent complaints */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <CardTitle>Recent Complaints</CardTitle>
                <Badge variant="secondary">{data.recentComplaints.length}</Badge>
              </div>
              <Link
                to="/admin/complaints"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {data.recentComplaints.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  message="No complaints filed yet."
                />
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
                          {complaint.complainantName} and {complaint.respondentName}
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

          {/* Status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>By Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = data.statusCounts[status] ?? 0;
                const pct = Math.round((count / statusTotal) * 100);
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className={cn(
                            "size-2.5 rounded-full",
                            STATUS_DOT[status],
                          )}
                        />
                        {t(`st_${status}` as Key)}
                      </span>
                      <span className="font-medium tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", STATUS_DOT[status])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Needs attention */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t("needsAttention")}
              </CardTitle>
              {data.attention.length > 0 && (
                <Badge variant="destructive">{data.attention.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {data.attention.length === 0 ? (
                <EmptyState icon={CheckCircle2} message={t("allClear")} />
              ) : (
                <div className="divide-y">
                  {data.attention.map((item) => (
                    <Link
                      key={item.id}
                      to={`/admin/complaints/${item.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.reference}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.complainantName} and {item.respondentName}
                        </p>
                        {item.dueAt && (
                          <p className="text-xs text-muted-foreground">
                            {t("dueDate")}: {formatDate(item.dueAt)}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          item.risk === "overdue" ? "destructive" : "secondary"
                        }
                        className={
                          item.risk === "due_soon"
                            ? "border-transparent bg-amber-500 text-white"
                            : ""
                        }
                      >
                        {item.risk === "overdue" ? t("overdue") : t("dueSoon")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming hearings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sky-500" />
                Upcoming Mediation
              </CardTitle>
              {data.upcomingHearings.length > 0 && (
                <Badge variant="secondary">
                  {data.upcomingHearings.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {data.upcomingHearings.length === 0 ? (
                <EmptyState icon={Calendar} message="No mediation scheduled." />
              ) : (
                <div className="divide-y">
                  {data.upcomingHearings.map((hearing) => (
                    <div
                      key={hearing.id}
                      className="flex items-start gap-3 py-3"
                    >
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {formatDateTime(hearing.scheduledAt)}
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
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: LucideIcon;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
