export const CHART_COLORS = [
  "var(--primary)",
  "color-mix(in oklab, var(--primary) 78%, var(--card))",
  "color-mix(in oklab, var(--primary) 58%, var(--card))",
  "color-mix(in oklab, var(--primary) 40%, var(--card))",
  "color-mix(in oklab, var(--primary) 25%, var(--card))",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
} as const;

export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
