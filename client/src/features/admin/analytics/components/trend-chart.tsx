import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useT } from "@/lib/I18n";
import { AXIS_TICK, TOOLTIP_STYLE } from "./chart-theme";
import EmptyChart from "./empty-chart";
import type { TrendDatum } from "./types";

export default function TrendChart({ data }: { data: TrendDatum[] }) {
  const { t } = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("anTrends")}</CardTitle>
        <CardDescription>{t("anTrendsDesc")}</CardDescription>
        <CardAction>
          <Badge variant="outline" className="text-xs font-normal">
            {t("anAllTime")}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="h-[320px]">
        {data.length === 0 ? (
          <EmptyChart message={t("anNoData")} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8 }}>
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
  );
}
