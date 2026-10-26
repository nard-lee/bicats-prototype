import { useEffect, useState } from "react";
import { useLoaderData } from "react-router";
import { useT, type Key } from "@/lib/I18n";
import { api } from "@/lib/api";
import { csvCell } from "@/lib/csv";
import ScopeControls from "./components/scope-controls";
import StatCards from "./components/stat-cards";
import TypeDonut from "./components/type-donut";
import PurokBars from "./components/purok-bars";
import TrendChart from "./components/trend-chart";
import PrintReport from "./components/print-report";
import type { DigestData, Kpi, ReportData } from "./components/types";

const NOW = new Date();

/** Oldest bucket any scope can ask for; the range queries only need a lower bound. */
const EARLIEST = "1970-01";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, delta: number): string {
  const [year = 1970, month = 1] = key.split("-").map(Number);
  return monthKey(new Date(year, month - 1 + delta, 1));
}

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

  const thisMonth = monthKey(NOW);
  const year = NOW.getFullYear();
  const scopeGroups = [
    {
      label: t("anGroupRanges"),
      options: [
        { value: `${EARLIEST}~${thisMonth}`, label: t("anAllTime") },
        ...[3, 6, 12].map((n) => ({
          value: `${shiftMonth(thisMonth, -(n - 1))}~${thisMonth}`,
          label: `${t("anLast")} ${n} ${t("anMonthsUnit")}`,
        })),
        ...[2, 3, 5].map((n) => ({
          value: `${shiftMonth(thisMonth, -(n * 12 - 1))}~${thisMonth}`,
          label: `${t("anLast")} ${n} ${t("anYearsUnit")}`,
        })),
      ],
    },
    {
      label: t("anGroupYears"),
      options: Array.from({ length: 6 }, (_, i) => year - i).map((y) => ({
        value: `${y}-01~${y}-12`,
        label: y === year ? t("anThisYear") : String(y),
      })),
    },
    {
      label: t("anGroupMonths"),
      options: monthOptionsFor(NOW).map((option) => ({
        value: `${option.value}~${option.value}`,
        label: option.label,
      })),
    },
  ];

  const [scopeValue, setScopeValue] = useState(`${thisMonth}~${thisMonth}`);
  const [digest, setDigest] = useState<DigestData | null>(null);
  const scope = scopeValue.split("~");
  const from = scope[0] ?? thisMonth;
  const to = scope[1] ?? thisMonth;

  useEffect(() => {
    let active = true;
    api
      .get(`analytics/digest?from=${from}&to=${to}`)
      .json<DigestData>()
      .then((d) => {
        if (active) setDigest(d);
      })
      .catch(() => {
        if (active) setDigest(null);
      });
    return () => {
      active = false;
    };
  }, [from, to]);

  const locale = lang === "tl" ? "fil-PH" : "en-PH";

  // The scope dropdown drives the charts; only the filing trend spans every month.
  const typeData = (digest?.filed.byType ?? [])
    .map((item) => ({
      name: t(item.complaintType as Key) || item.complaintType,
      value: item._count.complaintType,
    }))
    .sort((a, b) => b.value - a.value);

  const hotspotData = (digest?.filed.byPurok ?? [])
    .map((item) => ({
      name: item.complainantPurok,
      cases: item._count.complainantPurok,
    }))
    .sort((a, b) => b.cases - a.cases);

  const trendData = data.trends.map((item) => ({
    date: new Date(item.month),
    name: new Date(item.month).toLocaleString(locale, { month: "short" }),
    cases: item.count,
  }));

  const kpis: Kpi[] = digest
    ? [
        { label: t("anDigestFiled"), value: String(digest.filed.total) },
        {
          label: t("anDigestResolved"),
          value: String(digest.resolved.total),
          hint: `· ${digest.resolved.settled} / ${digest.resolved.certified} / ${digest.resolved.dismissed}`,
        },
        {
          label: t("anDigestAvgTime"),
          value:
            digest.resolved.avgResolutionDays != null
              ? digest.resolved.avgResolutionDays.toFixed(1)
              : "—",
          hint: digest.resolved.avgResolutionDays != null ? t("anDigestDays") : undefined,
        },
        {
          label: t("anDigestSessions"),
          value: String(digest.sessions.held),
          hint: `· ${digest.sessions.noShow} ${t("anDigestNoShow")}`,
        },
        { label: t("anDigestOpen"), value: String(digest.snapshot.open) },
        { label: t("anDigestOverdue"), value: String(digest.snapshot.overdue) },
      ]
    : [];

  const shortMonth = (key: string) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleString(locale, { month: "short", year: "2-digit" });
  const scopeLabel =
    from === EARLIEST
      ? t("anAllTime")
      : from === to
        ? new Date(`${from}-01T00:00:00Z`).toLocaleString(locale, {
            month: "long",
            year: "numeric",
          })
        : from.endsWith("-01") && to.endsWith("-12") && from.slice(0, 4) === to.slice(0, 4)
          ? from.slice(0, 4)
          : `${shortMonth(from)} – ${shortMonth(to)}`;

  function exportCsv() {
    const rows: string[][] = [];

    rows.push([`${t("adminAnalytics")} — ${scopeLabel}`]);
    rows.push(["Generated", new Date().toLocaleString(locale)]);
    rows.push([]);
    for (const kpi of kpis) rows.push([kpi.label, kpi.value, kpi.hint ?? ""]);
    rows.push([]);
    rows.push([`${t("anTypes")} — ${scopeLabel}`, "Count"]);
    for (const item of typeData) rows.push([item.name, String(item.value)]);
    rows.push([]);
    rows.push([`${t("anHotspots")} — ${scopeLabel}`, "Cases"]);
    for (const item of hotspotData) rows.push([item.name, String(item.cases)]);
    rows.push([]);
    rows.push([t("anTrends"), "Count"]);
    for (const item of trendData) {
      const key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}`;
      rows.push([key, String(item.cases)]);
    }

    const csv = rows.map((row) => row.map((value) => csvCell(value)).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

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
      <PrintReport scopeLabel={scopeLabel} digest={digest} digestRows={digestRows} />

      <div className="space-y-6 print:hidden">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold">{t("adminAnalytics")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("anSubtitle")}</p>
          </div>
          <ScopeControls
            value={scopeValue}
            onValueChange={setScopeValue}
            groups={scopeGroups}
            onExport={exportCsv}
          />
        </header>

        {/* The chosen scope, in one strip */}
        <StatCards kpis={kpis} />

        {/* What the chosen scope looks like */}
        <section className="grid gap-6 lg:grid-cols-2">
          <TypeDonut data={typeData} scopeLabel={scopeLabel} />
          <PurokBars data={hotspotData} scopeLabel={scopeLabel} />
        </section>

        {/* The one chart that always spans every month */}
        <TrendChart data={trendData} />
      </div>
    </>
  );
}
