import { useLoaderData } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { AlertTriangle, CalendarClock, ClipboardList, MapPin } from "lucide-react";
import { useT, type Key } from "@/lib/I18n";

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

export default function AdminReport() {
  const { t, lang } = useT();
  const data = useLoaderData() as ReportData;

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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{t("adminAnalytics")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("anSubtitle")}
        </p>
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
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}
