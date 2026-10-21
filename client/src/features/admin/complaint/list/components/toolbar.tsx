import type { ReactNode } from "react";
import { Link } from "react-router";
import { RefreshCw } from "lucide-react";
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
import { PRIORITIES } from "../../priority";
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
  priority: string;
  reloading: boolean;
  onReload: () => void;
  onApplyStat: (kind: StatKind) => void;
  onApplyParam: (key: "status" | "type" | "priority", value: string) => void;
  pagination: ReactNode;
};

export default function Toolbar({
  q,
  hasFilters,
  activeStat,
  statFilters,
  status,
  type,
  priority,
  reloading,
  onReload,
  onApplyStat,
  onApplyParam,
  pagination,
}: ToolbarProps) {
  const { t } = useT();

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
                      "text-xs tabular-nums",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {value}
                  </span>
                </button>
              );
            })}
          </div>

          {hasFilters && (
            <Button asChild type="button" variant="ghost" size="sm">
              <Link to="/admin/complaints">{t("clClear")}</Link>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
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

          <Select
            value={priority}
            onValueChange={(v) => onApplyParam("priority", v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("anyPriority")}</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`pr_${p}` as Key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto">{pagination}</div>
        </div>
      </div>
    </>
  );
}
