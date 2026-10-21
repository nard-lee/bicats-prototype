import { useEffect, useState } from "react";
import { useLoaderData } from "react-router";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { AlertTriangle, CalendarClock, ClipboardList, FileDown, MapPin, Printer } from "lucide-react";
import { useT, type Key } from "@/lib/I18n";
import { api } from "@/lib/api";

// Warm on-brand palette derived from the theme tokens so the charts match the
// rest of the app instead of the old hardcoded colours.
const CHART_COLORS = [
  "var(--primary)",
  "color-mix(in oklab, var(--primary) 78%, var(--card))",
  "color-mix(in oklab, var(--primary) 58%, var(--card))",
  "color-mix(in oklab, var(--primary) 40%, var(--card))",
  "color-mix(in oklab, var(--primary) 25%, var(--card))",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const STATUS_ORDER = [
  "received",
  "summoned",
  "mediation",
  "conciliation",
  "settled",
  "certified",
  "dismissed",
];

const statusColor = (status: string) => {
  const index = STATUS_ORDER.indexOf(status);
  return CHART_COLORS[Math.max(0, index) % CHART_COLORS.length];
};

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
} as const;

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

const NOW = new Date();

type ReportData = {
  types: { complaintType: string; _count: { complaintType: number } }[];
  hotspots: { complainantPurok: string; _count: { complainantPurok: number } }[];
  trends: { month: string; count: number }[];
  statusDist: { status: string; _count: { status: number } }[];
};

type DigestData = {
  month: string;
  filed: {
    total: number;
    byType: { complaintType: string; _count: { complaintType: number } }[];
    byPurok: { complainantPurok: string; _count: { complainantPurok: number } }[];
  };
  resolved: {
    total: number;
    settled: number;
    certified: number;
    dismissed: number;
    avgResolutionDays: number | null;
  };
  sessions: { held: number; noShow: number };
  snapshot: { open: number; overdue: number };
};

function monthOptionsFor(now: Date): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: date.toLocaleString("en-PH", { month: "long", year: "numeric" }) });
  }
  return options;
}

export default function AdminReport() {
  const { t, lang } = useT();
  const data = useLoaderData() as ReportData;

  const monthOptions = monthOptionsFor(NOW);
  const [month, setMonth] = useState(monthOptions[0].value);
  const [digest, setDigest] = useState<DigestData | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get(`analytics/digest?month=${month}`)
      .json<DigestData>()
      .then((d) => {
        if (active) setDigest(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [month]);

  const locale = lang === "tl" ? "fil-PH" : "en-PH";

  const typeData = data.types.map((item) => ({
    name: t(item.complaintType as Key) || item.complaintType,
    value: item._count.complaintType,
  }));

  const hotspotData = data.hotspots.map((item) => ({
    name: item.complainantPurok,
    cases: item._count.complainantPurok,
  }));

  const trendData = data.trends.map((item) => ({
    date: new Date(item.month),
    name: new Date(item.month).toLocaleString(locale, { month: "short" }),
    cases: item.count,
  }));

  const statusData = data.statusDist
    .map((item) => ({
      status: item.status,
      name: t(`st_${item.status}` as Key) || item.status,
      value: item._count.status,
    }))
    .sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    );
  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0) || 1;

  const totalComplaints = typeData.reduce((sum, item) => sum + item.value, 0);
  const thisMonth =
    trendData.find(
      (item) =>
        item.date.getMonth() === NOW.getMonth() &&
        item.date.getFullYear() === NOW.getFullYear(),
    )?.cases ?? 0;

  const topType = typeData[0];
  const topPurok = hotspotData[0];

  const kpis = [
    { label: t("anTotal"), value: String(totalComplaints), icon: ClipboardList },
    { label: t("anThisMonth"), value: String(thisMonth), icon: CalendarClock },
    {
      label: t("anTopType"),
      value: topType?.name ?? "—",
      hint: topType ? `${topType.value} ${t("adminComplaints")}` : undefined,
      icon: AlertTriangle,
    },
    {
      label: t("anTopPurok"),
      value: topPurok?.name ?? "—",
      hint: topPurok ? `${topPurok.cases} ${t("adminComplaints")}` : undefined,
      icon: MapPin,
    },
  ];

  function exportCsv() {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows: string[][] = [];

    rows.push([`${t("adminAnalytics")} — ${t("anSubtitle")}`]);
    rows.push(["Generated", new Date().toLocaleString(locale)]);
    rows.push([]);
    if (digest) {
      rows.push([`${t("anDigest")} — ${digest.month}`]);
      rows.push([t("anDigestFiled"), String(digest.filed.total)]);
      rows.push([
        t("anDigestResolved"),
        String(digest.resolved.total),
        `${digest.resolved.settled} settled / ${digest.resolved.certified} certified / ${digest.resolved.dismissed} dismissed`,
      ]);
      rows.push([
        t("anDigestAvgTime"),
        digest.resolved.avgResolutionDays != null
          ? `${digest.resolved.avgResolutionDays.toFixed(1)} ${t("anDigestDays")}`
          : "—",
      ]);
      rows.push([t("anDigestSessions"), String(digest.sessions.held)]);
      rows.push([t("anDigestNoShow"), String(digest.sessions.noShow)]);
      rows.push([t("anDigestOpen"), String(digest.snapshot.open)]);
      rows.push([t("anDigestOverdue"), String(digest.snapshot.overdue)]);
      rows.push([]);
    }
    rows.push([t("anTotal"), String(totalComplaints)]);
    rows.push([t("anThisMonth"), String(thisMonth)]);
    rows.push([t("anTopType"), topType ? `${topType.name} (${topType.value})` : "—"]);
    rows.push([t("anTopPurok"), topPurok ? `${topPurok.name} (${topPurok.cases})` : "—"]);
    rows.push([]);
    rows.push([t("anTypes"), "Count"]);
    for (const item of typeData) rows.push([item.name, String(item.value)]);
    rows.push([]);
    rows.push([t("anTrends"), "Count"]);
    for (const item of trendData) {
      const month = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}`;
      rows.push([month, String(item.cases)]);
    }
    rows.push([]);
    rows.push([t("anHotspots"), "Cases"]);
    for (const item of hotspotData) rows.push([item.name, String(item.cases)]);
    rows.push([]);
    rows.push([t("anStatusTitle"), "Count"]);
    for (const item of statusData) rows.push([item.name, String(item.value)]);

    const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const monthLabel = monthOptions.find((option) => option.value === month)?.label ?? month;
  const digestRows: [string, string][] = digest
    ? [
        [t("anDigestFiled"), String(digest.filed.total)],
        [
          t("anDigestResolved"),
          `${digest.resolved.total} — ${t("st_settled")} ${digest.resolved.settled}, ${t("st_certified")} ${digest.resolved.certified}, ${t("st_dismissed")} ${digest.resolved.dismissed}`,
        ],
        [
          t("anDigestAvgTime"),
          digest.resolved.avgResolutionDays != null
            ? `${digest.resolved.avgResolutionDays.toFixed(1)} ${t("anDigestDays")}`
            : "—",
        ],
        [t("anDigestSessions"), String(digest.sessions.held)],
        [t("anDigestNoShow"), String(digest.sessions.noShow)],
        [t("anDigestOpen"), String(digest.snapshot.open)],
        [t("anDigestOverdue"), String(digest.snapshot.overdue)],
      ]
    : [];

  return (
    <>
      {/* Print-only: a plain paper document instead of the dashboard */}
      <article className="mx-auto hidden w-full max-w-[210mm] bg-white px-[18mm] py-[14mm] text-black print:block">
        <h1 className="text-center text-sm font-bold tracking-wide uppercase">
          {t("adminAnalytics")}
        </h1>
        <p className="mt-1 text-center text-xs">{monthLabel}</p>

        {digest && (
          <table className="mt-8 w-full border-collapse text-[13px]">
            <tbody>
              {digestRows.map(([label, value]) => (
                <tr key={label} className="border-b border-black/20 align-top">
                  <td className="w-1/2 px-1 py-1.5 pr-4">{label}</td>
                  <td className="px-1 py-1.5 text-right font-semibold">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {digest && (
          <div className="mt-10 grid grid-cols-2 gap-12">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase">{t("anDigestByType")}</p>
              <table className="w-full border-collapse text-[13px]">
                <tbody>
                  {digest.filed.byType.map((item) => (
                    <tr key={item.complaintType} className="border-b border-black/20">
                      <td className="px-1 py-1">
                        {t(item.complaintType as Key) || item.complaintType}
                      </td>
                      <td className="px-1 py-1 text-right">{item._count.complaintType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase">{t("anTopPurok")}</p>
              <table className="w-full border-collapse text-[13px]">
                <tbody>
                  {digest.filed.byPurok.map((item) => (
                    <tr key={item.complainantPurok} className="border-b border-black/20">
                      <td className="px-1 py-1">{item.complainantPurok}</td>
                      <td className="px-1 py-1 text-right">{item._count.complainantPurok}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>

      <div className="space-y-8 print:hidden">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("adminAnalytics")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("anSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 print-hide">
          <Button variant="outline" onClick={exportCsv}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </header>

      {/* At a glance */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardContent className="flex flex-row items-center gap-2 overflow-hidden">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <p className="shrink-0 text-xl leading-none font-semibold" title={value}>
                {value}
              </p>
              <p className="truncate text-sm text-muted-foreground">{label}</p>
              {hint && (
                <p className="shrink-0 text-xs text-muted-foreground">· {hint}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Monthly digest */}
      <Card>
        <CardHeader>
          <CardTitle>{t("anDigest")}</CardTitle>
          <CardDescription>
            {t("anDigestDesc")}
          </CardDescription>
          <CardAction className="print-hide">
            <select
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </CardAction>
        </CardHeader>
        <CardContent>
          {digest ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {(
                  [
                    { label: t("anDigestFiled"), value: String(digest.filed.total), hint: undefined },
                    {
                      label: t("anDigestResolved"),
                      value: String(digest.resolved.total),
                      hint: `${digest.resolved.settled} / ${digest.resolved.certified} / ${digest.resolved.dismissed}`,
                    },
                    {
                      label: t("anDigestAvgTime"),
                      value:
                        digest.resolved.avgResolutionDays != null
                          ? `${digest.resolved.avgResolutionDays.toFixed(1)}`
                          : "—",
                      hint: t("anDigestDays"),
                    },
                    { label: t("anDigestSessions"), value: String(digest.sessions.held), hint: undefined },
                    { label: t("anDigestNoShow"), value: String(digest.sessions.noShow), hint: undefined },
                    { label: t("anDigestOpen"), value: String(digest.snapshot.open), hint: undefined },
                    { label: t("anDigestOverdue"), value: String(digest.snapshot.overdue), hint: undefined },
                  ] as { label: string; value: string; hint?: string }[]
                ).map(({ label, value, hint }) => (
                  <div
                    key={label}
                    className="rounded-lg border bg-muted/30 px-4 py-3 print:bg-white"
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 flex items-baseline gap-1.5 text-xl font-semibold">
                      {value}
                      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold">{t("anDigestByType")}</p>
                  {digest.filed.byType.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("anNoData")}</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {digest.filed.byType.slice(0, 6).map((item) => (
                        <li key={item.complaintType} className="flex justify-between gap-4">
                          <span className="truncate text-muted-foreground">
                            {t(item.complaintType as Key) || item.complaintType}
                          </span>
                          <span className="font-medium">{item._count.complaintType}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">{t("anTopPurok")}</p>
                  {digest.filed.byPurok.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("anNoData")}</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {digest.filed.byPurok.map((item) => (
                        <li key={item.complainantPurok} className="flex justify-between gap-4">
                          <span className="truncate text-muted-foreground">
                            {item.complainantPurok}
                          </span>
                          <span className="font-medium">{item._count.complainantPurok}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              {t("anNoData")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Where cases stand */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("anTypes")}</CardTitle>
            <CardDescription>{t("anTypesDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {typeData.length === 0 ? (
              <EmptyChart message={t("anNoData")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    dataKey="value"
                    stroke="var(--card)"
                    strokeWidth={2}
                    label={({ percent }: { percent?: number }) =>
                      `${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {typeData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, lineHeight: "1.8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("anStatusTitle")}</CardTitle>
            <CardDescription>{t("anStatusDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            {statusData.length === 0 ? (
              <EmptyChart message={t("anNoData")} />
            ) : (
              statusData.map(({ status, name, value }) => {
                const pct = Math.round((value / statusTotal) * 100);
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: statusColor(status) }}
                        />
                        {name}
                      </span>
                      <Badge variant="secondary">
                        {value}{" "}
                        <span className="text-muted-foreground">({pct}%)</span>
                      </Badge>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: statusColor(status),
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      {/* Over time and place */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("anTrends")}</CardTitle>
            <CardDescription>{t("anTrendsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {trendData.length === 0 ? (
              <EmptyChart message={t("anNoData")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 8 }}>
                  <XAxis
                    dataKey="name"
                    tick={AXIS_TICK}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ stroke: "var(--border)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cases"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("anHotspots")}</CardTitle>
            <CardDescription>{t("anHotspotsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {hotspotData.length === 0 ? (
              <EmptyChart message={t("anNoData")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hotspotData} margin={{ top: 8, right: 8 }}>
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                    tick={AXIS_TICK}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  />
                  <Bar
                    dataKey="cases"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">{t("anBasedOn")}</p>
      </div>
    </>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}
