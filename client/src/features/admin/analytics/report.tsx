import { useLoaderData } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#d88484",
  "#84c2d8",
  "#a8d884",
];

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

  const statusData = data.statusDist.map((item) => ({
    name: t(`st_${item.status}` as Key) || item.status,
    value: item._count.status,
  }));
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
          <Card key={label}>
            <CardContent className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 truncate text-xl font-semibold" title={value}>
                  {value}
                </p>
                {hint && (
                  <p className="text-xs text-muted-foreground">{hint}</p>
                )}
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
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
                    label={({ percent }: { percent?: number }) =>
                      `${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {typeData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
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
          <CardContent className="justify-center gap-4">
            {statusData.length === 0 ? (
              <EmptyChart message={t("anNoData")} />
            ) : (
              statusData.map(({ name, value }) => {
                const pct = Math.round((value / statusTotal) * 100);
                return (
                  <div key={name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-medium">
                        {value}{" "}
                        <span className="text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
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
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="cases"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 3 }}
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
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="cases" fill="#82ca9d" radius={[4, 4, 0, 0]} />
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
