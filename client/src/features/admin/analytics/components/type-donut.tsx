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
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useT } from "@/lib/I18n";
import { CHART_COLORS, TOOLTIP_STYLE } from "./chart-theme";
import EmptyChart from "./empty-chart";
import type { TypeDatum } from "./types";

type TypeDonutProps = {
  data: TypeDatum[];
  scopeLabel: string;
};

export default function TypeDonut({ data, scopeLabel }: TypeDonutProps) {
  const { t } = useT();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("anTypes")}</CardTitle>
        <CardDescription>{t("anTypesDesc")}</CardDescription>
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
            <PieChart>
              <Pie
                data={data}
                cx="36%"
                cy="50%"
                innerRadius={48}
                outerRadius={86}
                paddingAngle={1}
                dataKey="value"
                stroke="var(--card)"
                strokeWidth={2}
                label={({ percent }: { percent?: number }) =>
                  (percent ?? 0) >= 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ""
                }
              >
                {data.map((_entry, index) => (
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
                iconSize={8}
                wrapperStyle={{ fontSize: 12, lineHeight: "1.7", maxWidth: 210 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
