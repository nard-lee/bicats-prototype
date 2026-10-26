import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { complaintTypeKeys, useT, type Key } from "@/lib/I18n";
import { ComplaintSearch } from "../search";
import { STATUSES } from "./statuses";

export type StatKind = "total" | "open" | "overdue" | "dueSoon" | "settled";

type StatFilter = {
  kind: StatKind;
  label: string;
  value: number;
};

type ToolbarProps = {
  q: string;
  hasFilters: boolean;
  activeStat: StatKind | null;
  statFilters: StatFilter[];
  status: string;
  type: string;
  reloading: boolean;
  onReload: () => void;
  onApplyStat: (kind: StatKind) => void;
  onApplyParam: (key: "status" | "type", value: string) => void;
  pagination: ReactNode;
};

export default function Toolbar({
  q,
  hasFilters,
  activeStat,
  statFilters,
  status,
  type,
  reloading,
  onReload,
  onApplyStat,
  onApplyParam,
  pagination,
}: ToolbarProps) {
  const { t } = useT();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = [status, type].filter((v) => v !== "all").length;
  const filtersLabel =
    activeFilters > 0 ? `${t("clFilters")} (${activeFilters})` : t("clFilters");

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {t("adminComplaints")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("clSubtitle")}</p>
        </div>
        <ComplaintSearch defaultValue={q} />
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onReload}
            disabled={reloading}
            title={t("clReload")}
            aria-label={t("clReload")}
          >
            <RefreshCw className={reloading ? "animate-spin" : ""} />
          </Button>

          <Button
            type="button"
            variant={filtersOpen ? "secondary" : "outline"}
            size="icon"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-label={filtersLabel}
            title={filtersLabel}
            className="relative"
          >
            <SlidersHorizontal />
            {activeFilters > 0 && !filtersOpen && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            )}
          </Button>

          {filtersOpen && (
            <>
              <Select value={status} onValueChange={(v) => onApplyParam("status", v)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("clAllStatuses")}</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`st_${s}` as Key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={type} onValueChange={(v) => onApplyParam("type", v)}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("clAllTypes")}</SelectItem>
                  {complaintTypeKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {!filtersOpen && (
            <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1">
              {statFilters.map(({ kind, label, value }) => {
                const active = activeStat === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onApplyStat(kind)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        "text-sm tabular-nums",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {hasFilters && (
            <Button asChild type="button" variant="ghost" size="sm">
              <Link to="/admin/complaints">{t("clClear")}</Link>
            </Button>
          )}

          <div className="ml-auto">{pagination}</div>
        </div>
      </div>
    </>
  );
}
