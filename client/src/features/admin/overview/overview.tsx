import { Link, useLoaderData } from "react-router";
import { Calendar, CheckCircle2, ChevronRight, ClipboardList } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const stats: { label: string; value: string; to?: string }[] = [
    { label: t("ovStatTotal"), value: String(data.totals.complaints), to: "/admin/complaints" },
    { label: t("ovStatOpen"), value: String(data.totals.open) },
    { label: t("overdue"), value: String(data.totals.overdue), to: "/admin/complaints?overdue=true" },
    { label: t("dueSoon"), value: String(data.totals.atRisk), to: "/admin/complaints?dueSoon=true" },
    { label: t("st_settled"), value: String(data.totals.settled) },
    {
      label: t("ovStatNotices"),
      value:
        data.totals.notices === 0
          ? "0"
          : `${data.totals.publishedNotices}/${data.totals.notices}`,
    },
  ];

  const statuses = STATUS_ORDER.filter((s) => (data.statusCounts[s] ?? 0) > 0);
  const statusTotal =
    STATUS_ORDER.reduce((sum, s) => sum + (data.statusCounts[s] ?? 0), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {t("adminOverview")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("ovSubtitle")}</p>
        </div>
        <span className="text-sm text-muted-foreground">{today}</span>
      </div>

      {/* One segment per number; the ones with a list behind them link to it */}
      <div className="grid gap-px overflow-hidden rounded-xl border bg-border ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, to }) => {
          const body = (
            <div className="flex items-baseline gap-2 px-4 py-3">
              <p className="shrink-0 text-xl leading-none font-semibold tabular-nums">
                {value}
              </p>
              <p
                className={cn(
                  "min-w-0 flex-1 text-xs leading-tight",
                  to ? "text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </p>
              {to && (
                <ChevronRight className="size-3.5 shrink-0 self-center opacity-60" />
              )}
            </div>
          );
          return to ? (
            <Link
              key={label}
              to={to}
              className="block bg-card outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {body}
            </Link>
          ) : (
            <div key={label} className="bg-card">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs attention */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("needsAttention")}</CardTitle>
            {data.attention.length > 0 && (
              <CardAction>
                <Badge variant="destructive">{data.attention.length}</Badge>
              </CardAction>
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
                    className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium tabular-nums">
                      {item.reference}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {item.complainantName} and {item.respondentName}
                    </span>
                    {item.dueAt && (
                      <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
                        {formatDate(item.dueAt)}
                      </span>
                    )}
                    <Badge
                      variant={item.risk === "overdue" ? "destructive" : "secondary"}
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
          <CardHeader>
            <CardTitle>{t("ovUpcoming")}</CardTitle>
            {data.upcomingHearings.length > 0 && (
              <CardAction>
                <Badge variant="secondary">{data.upcomingHearings.length}</Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {data.upcomingHearings.length === 0 ? (
              <EmptyState icon={Calendar} message={t("ovNoMediation")} />
            ) : (
              <div className="divide-y">
                {data.upcomingHearings.map((hearing) => (
                  <div
                    key={hearing.id}
                    className="flex items-baseline gap-3 py-2.5"
                  >
                    <span className="shrink-0 text-xs font-medium tabular-nums">
                      {formatDateTime(hearing.scheduledAt)}
                    </span>
                    {hearing.complaint && (
                      <Link
                        to={`/admin/complaints/${hearing.complaint.id}`}
                        className="min-w-0 flex-1 truncate text-xs text-muted-foreground hover:text-foreground"
                      >
                        {hearing.complaint.reference} ·{" "}
                        {hearing.complaint.complainantName}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent complaints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("ovRecent")}
            <Badge variant="secondary">{data.recentComplaints.length}</Badge>
          </CardTitle>
          <CardAction>
            <Link
              to="/admin/complaints"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("ovViewAll")}
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {data.recentComplaints.length === 0 ? (
            <EmptyState icon={ClipboardList} message={t("ovNoComplaints")} />
          ) : (
            <div className="divide-y">
              {data.recentComplaints.map((complaint) => (
                <Link
                  key={complaint.id}
                  to={`/admin/complaints/${complaint.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <span className="text-sm font-medium tabular-nums">
                    {complaint.reference}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {complaint.complainantName} and {complaint.respondentName}
                  </span>
                  <Badge variant="secondary">
                    {t(`st_${complaint.status}` as Key)}
                  </Badge>
                  <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
                    {formatDate(complaint.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status mix */}
      <Card>
        <CardHeader>
          <CardTitle>{t("ovByStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          {statuses.length === 0 ? (
            <EmptyState icon={ClipboardList} message={t("ovNoComplaints")} />
          ) : (
            <>
              <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
                {statuses.map((status) => {
                  const count = data.statusCounts[status] ?? 0;
                  return (
                    <div
                      key={status}
                      className={cn("h-full", STATUS_DOT[status])}
                      style={{ width: `${(count / statusTotal) * 100}%` }}
                      title={`${t(`st_${status}` as Key)}: ${count}`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {statuses.map((status) => (
                  <span key={status} className="flex items-center gap-1.5">
                    <span
                      className={cn("size-2 rounded-full", STATUS_DOT[status])}
                    />
                    <span className="text-muted-foreground">
                      {t(`st_${status}` as Key)}
                    </span>
                    <span className="font-medium tabular-nums">
                      {data.statusCounts[status] ?? 0}
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: typeof ClipboardList;
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
