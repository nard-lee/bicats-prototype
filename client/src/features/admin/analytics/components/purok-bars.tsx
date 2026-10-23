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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useT } from "@/lib/I18n";
import { AXIS_TICK, TOOLTIP_STYLE } from "./chart-theme";
import EmptyChart from "./empty-chart";
import type { HotspotDatum } from "./types";

type PurokBarsProps = {
  data: HotspotDatum[];
  scopeLabel: string;
};

export default function PurokBars({ data, scopeLabel }: PurokBarsProps) {
  const { t } = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("anHotspots")}</CardTitle>
        <CardDescription>{t("anHotspotsDesc")}</CardDescription>
        <CardAction>
          <Badge variant="outline" className="font-normal">
            {scopeLabel}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="h-[320px]">
        {data.length === 0 ? (
          <EmptyChart message={t("anNoData")} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8 }}>
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
  );
}
