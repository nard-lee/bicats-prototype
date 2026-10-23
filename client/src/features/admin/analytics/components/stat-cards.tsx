import type { Kpi } from "./types";

export default function StatCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <section className="grid gap-px overflow-hidden rounded-xl border bg-border ring-1 ring-foreground/10 sm:grid-cols-3 xl:grid-cols-6">
      {kpis.map(({ label, value, hint }) => (
        <div key={label} className="bg-card px-4 py-3 print:bg-white">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xl font-semibold tabular-nums">
            {value}
            {hint && (
              <span className="text-sm font-normal text-muted-foreground">{hint}</span>
            )}
          </p>
        </div>
      ))}
    </section>
  );
}
