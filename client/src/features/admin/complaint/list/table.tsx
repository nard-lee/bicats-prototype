import { useState } from "react";
import {
  Form,
  Link,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useRouteLoaderData,
  useSearchParams,
} from "react-router";
import { FileDown, RefreshCw, SlidersHorizontal, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import DataPagination from "@/components/data-pagination";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { complaintTypeKeys, useT, type Key } from "@/lib/I18n";
import { complaintTypeLabel } from "../type-label";
import { ComplaintSearch } from "./search";
import { PRIORITIES, PRIORITY_STYLE } from "../priority";
import type { ComplaintListItem, ComplaintStatus, ComplaintsPage } from "./loader";
import type { AdminLoaderData } from "@/layouts/admin/loader";

const STATUSES: ComplaintStatus[] = [
  "received",
  "summoned",
  "mediation",
  "conciliation",
  "settled",
  "certified",
  "dismissed",
];

const OPEN_STATUSES: ComplaintStatus[] = [
  "received",
  "summoned",
  "mediation",
  "conciliation",
];

// Transparent checkbox: just an empty box that turns into a check when picked.
const CHECKBOX =
  "border-input bg-transparent shadow-none dark:bg-transparent data-checked:border-input data-checked:bg-transparent data-checked:text-primary dark:data-checked:bg-transparent";

const NOW_MS = Date.now();

const FILTER_MODE_KEY = "bicats:list-filter-mode";

type FilterMode = "quick" | "dropdown";

function loadFilterMode(): FilterMode {
  try {
    return localStorage.getItem(FILTER_MODE_KEY) === "dropdown" ? "dropdown" : "quick";
  } catch {
    return "quick";
  }
}

export default function ComplaintsList() {
  const { t, lang } = useT();
  const { items, total, page, pageSize, totalPages, stats } = useLoaderData() as ComplaintsPage;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [params] = useSearchParams();

  const [filterMode, setFilterMode] = useState<FilterMode>(loadFilterMode);
  const switchFilterMode = (mode: FilterMode) => {
    setFilterMode(mode);
    try {
      localStorage.setItem(FILTER_MODE_KEY, mode);
    } catch {
      // Private mode etc. — just keep the in-memory choice.
    }
  };

  // Secretaries keep the register but cannot change it.
  const { user } = useRouteLoaderData("admin") as AdminLoaderData;
  const canWrite = user?.role !== "secretary";
  const columnCount = canWrite ? 9 : 8;

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "all";
  const type = params.get("type") ?? "all";
  const priority = params.get("priority") ?? "all";
  const risk = params.get("risk") ?? "all";
  const hasFilters =
    q !== "" ||
    status !== "all" ||
    type !== "all" ||
    priority !== "all" ||
    risk !== "all";

  const activeStat =
    risk === "open"
      ? "open"
      : risk === "overdue"
        ? "overdue"
        : risk === "dueSoon"
          ? "dueSoon"
          : status === "settled"
            ? "settled"
            : status === "all"
              ? "total"
              : null;

  const applyStat = (kind: "total" | "open" | "overdue" | "dueSoon" | "settled") => {
    const next = new URLSearchParams(params);
    next.delete("page");
    next.delete("status");
    next.delete("risk");

    if (kind === "open") next.set("risk", "open");
    else if (kind === "overdue") next.set("risk", "overdue");
    else if (kind === "dueSoon") next.set("risk", "dueSoon");
    else if (kind === "settled") next.set("status", "settled");

    const qs = next.toString();
    navigate(`/admin/complaints${qs ? `?${qs}` : ""}`);
  };

  const [bulkStatus, setBulkStatus] = useState<ComplaintStatus>("received");
  const [applying, setApplying] = useState(false);

  // Keep the selection across a plain reload, but drop it when the
  // filters or page change (different set of rows).
  const viewKey = params.toString();
  const [selection, setSelection] = useState({ viewKey, ids: [] as number[] });
  const selected = selection.viewKey === viewKey ? selection.ids : [];
  const setSelected = (ids: number[] | ((current: number[]) => number[])) => {
    setSelection((current) => {
      const base = current.viewKey === viewKey ? current.ids : [];
      return { viewKey, ids: typeof ids === "function" ? ids(base) : ids };
    });
  };

  const allSelected = items.length > 0 && selected.length === items.length;
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () =>
    setSelected(allSelected ? [] : items.map((c) => c.id));

  const toggleOne = (id: number) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  async function applyBulkStatus() {
    if (selected.length === 0) return;

    setApplying(true);
    try {
      await api.post("/complaints/bulk-status", {
        json: { ids: selected, status: bulkStatus },
      });
      toast.success(`Updated ${selected.length} complaint(s).`);
      setSelected([]);
      revalidator.revalidate();
    } catch {
      toast.error("Failed to update complaints.");
    } finally {
      setApplying(false);
    }
  }

  function exportCsv() {
    const rows = items.filter((c) => selected.includes(c.id));

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = rows.map((c) =>
      [
        c.reference,
        c.complainantName,
        c.respondentName,
        complaintTypeLabel(c.complaintType, c.complaintTypeOther, t),
        t(`st_${c.status}` as Key),
        t(`pr_${c.priority}` as Key),
        c.createdAt,
        c.dueAt ?? "",
      ]
        .map((value) => escape(String(value)))
        .join(","),
    );

    const csv = ["Reference,Complainant,Respondent,Type,Status,Priority,Filed,Due", ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
    });

  const DUE_SOON_MS = 3 * 24 * 60 * 60 * 1000;

  const isOverdue = (c: ComplaintListItem) =>
    !!c.dueAt &&
    new Date(c.dueAt).getTime() < NOW_MS &&
    OPEN_STATUSES.includes(c.status);

  const isDueSoon = (c: ComplaintListItem) => {
    if (!c.dueAt || !OPEN_STATUSES.includes(c.status)) return false;
    const time = new Date(c.dueAt).getTime();
    return time >= NOW_MS && time <= NOW_MS + DUE_SOON_MS;
  };

  // Quick triage vs dropdowns, remembered across visits.
  const modeTabs = (
    <div className="flex rounded-md border p-0.5" role="tablist" aria-label="Filter mode">
      <Button
        type="button"
        size="icon"
        variant={filterMode === "quick" ? "secondary" : "ghost"}
        className="size-7"
        title="Quick filters"
        aria-label="Quick filters"
        onClick={() => switchFilterMode("quick")}
      >
        <Zap className="!size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={filterMode === "dropdown" ? "secondary" : "ghost"}
        className="size-7"
        title="Dropdown filters"
        aria-label="Dropdown filters"
        onClick={() => switchFilterMode("dropdown")}
      >
        <SlidersHorizontal className="!size-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      {filterMode === "quick" ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
            title="Reload"
          >
            <RefreshCw
              className={revalidator.state === "loading" ? "animate-spin" : ""}
            />
          </Button>
          {modeTabs}
          <Stat
            label="Total"
            value={stats.total}
            active={activeStat === "total"}
            onClick={() => applyStat("total")}
          />
          <Stat
            label="Open"
            value={stats.open}
            active={activeStat === "open"}
            onClick={() => applyStat("open")}
          />
          <Stat
            label="Overdue"
            value={stats.overdue}
            active={activeStat === "overdue"}
            onClick={() => applyStat("overdue")}
          />
          <Stat
            label="Due soon"
            value={stats.dueSoon}
            active={activeStat === "dueSoon"}
            onClick={() => applyStat("dueSoon")}
          />
          <Stat
            label="Settled"
            value={stats.settled}
            active={activeStat === "settled"}
            onClick={() => applyStat("settled")}
          />
          {hasFilters && (
            <Button asChild type="button" variant="outline">
              <Link to="/admin/complaints">Clear</Link>
            </Button>
          )}
          <div className="ml-2">
            <ComplaintSearch defaultValue={q} />
          </div>
          <div className="ml-auto">
            <DataPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
            />
          </div>
        </div>
      ) : (
        <Form
          method="get"
          className="flex shrink-0 flex-wrap items-center gap-2"
        >
          <input type="hidden" name="q" value={q} />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => revalidator.revalidate()}
          disabled={revalidator.state === "loading"}
          title="Reload"
        >
          <RefreshCw
            className={revalidator.state === "loading" ? "animate-spin" : ""}
          />
        </Button>

        {modeTabs}

        <Select name="status" defaultValue={status}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`st_${s}` as Key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select name="type" defaultValue={type}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {complaintTypeKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {t(k)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select name="priority" defaultValue={priority}>
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

        <Select name="risk" defaultValue={risk}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyDue")}</SelectItem>
            <SelectItem value="open">{t("openOnly")}</SelectItem>
            {["overdue", "dueSoon"].includes(risk) && (
              // Arriving via a stat button; show it so the select isn't blank.
              <SelectItem value={risk}>
                {t(risk === "overdue" ? "overdueOnly" : "dueSoonOnly")}
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <Button type="submit">Filter</Button>

        {hasFilters && (
          <Button asChild type="button" variant="outline">
            <Link to="/admin/complaints">Clear</Link>
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ComplaintSearch defaultValue={q} />
          <DataPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
          />
        </div>
      </Form>
      )}

      {selected.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium">{selected.length} selected</span>

          <Select
            value={bulkStatus}
            onValueChange={(value) => setBulkStatus(value as ComplaintStatus)}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`st_${s}` as Key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={applyBulkStatus} disabled={applying}>
            {applying ? "Applying..." : "Apply status"}
          </Button>

          <Button size="sm" variant="outline" onClick={exportCsv}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}

      <div className="-mx-6 min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-y [&>[data-slot=table-container]]:overflow-visible">
        <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:whitespace-normal [&_th]:px-4 [&_th]:whitespace-normal">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              {canWrite && (
                <TableHead className="w-10">
                  <Checkbox
                    className={CHECKBOX}
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>{t("refNumber")}</TableHead>
              <TableHead>Complainant</TableHead>
              <TableHead>Respondent</TableHead>
              <TableHead>{t("complaintType")}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{t("priority")}</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead>Filed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-10 text-center text-muted-foreground">
                  {hasFilters
                    ? "No complaints match your filters."
                    : "No complaints yet."}
                </TableCell>
              </TableRow>
            )}
            {items.map((c) => (
              <TableRow
                key={c.id}
                data-state={selected.includes(c.id) ? "selected" : undefined}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/admin/complaints/${c.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {canWrite && (
                    <Checkbox
                      className={CHECKBOX}
                      checked={selected.includes(c.id)}
                      onCheckedChange={() => toggleOne(c.id)}
                      aria-label={`Select ${c.reference}`}
                    />
                  )}
                </TableCell>
                <TableCell className="font-bold">
                  <span className="inline-flex items-center gap-2">
                    {c.reference}
                    {!c.viewedAt && (
                      <Badge className="h-5 px-1.5 text-[10px] uppercase tracking-wide">
                        New
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>{c.complainantName}</TableCell>
                <TableCell>{c.respondentName}</TableCell>
                <TableCell>
                  {complaintTypeLabel(c.complaintType, c.complaintTypeOther, t)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{t(`st_${c.status}` as Key)}</Badge>
                </TableCell>
                <TableCell>
                  {c.priority == "none" ? (<span className="text-muted-foreground">—</span>) : (
                    <Badge className={cn("border", PRIORITY_STYLE[c.priority])}>
                      {t(`pr_${c.priority}` as Key)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {c.dueAt ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {date(c.dueAt)}
                      </span>
                      {isOverdue(c) && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase tracking-wide">
                          {t("overdue")}
                        </Badge>
                      )}
                      {isDueSoon(c) && (
                        <Badge className="h-5 border-transparent bg-amber-500 px-1.5 text-[10px] tracking-wide text-white uppercase hover:bg-amber-500">
                          {t("dueSoon")}
                        </Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{date(c.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "outline"}
      onClick={onClick}
      aria-pressed={active}
      className="tabular-nums"
    >
      {value} {label}
    </Button>
  );
}
