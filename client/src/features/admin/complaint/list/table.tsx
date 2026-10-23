import { useState } from "react";
import {
  useLoaderData,
  useNavigate,
  useRevalidator,
  useRouteLoaderData,
  useSearchParams,
} from "react-router";
import { toast } from "sonner";
import DataPagination from "@/components/data-pagination";
import { api } from "@/lib/api";
import { CASE_WRITE_ROLES, type Role } from "@/lib/roles";
import { useT, type Key } from "@/lib/I18n";
import { complaintTypeLabel } from "../type-label";
import type { ComplaintStatus, ComplaintsPage } from "./loader";
import type { AdminLoaderData } from "@/layouts/admin/loader";
import Toolbar, { type StatKind } from "./components/toolbar";
import BulkBar from "./components/bulk-bar";
import ComplaintsTable from "./components/complaints-table";

export default function ComplaintsList() {
  const { t } = useT();
  const { items, total, page, pageSize, totalPages, stats } = useLoaderData() as ComplaintsPage;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [params] = useSearchParams();

  // Secretaries keep the register but cannot change it.
  const { user } = useRouteLoaderData("admin") as AdminLoaderData;
  const canWrite = !!user && CASE_WRITE_ROLES.includes(user.role as Role);

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

  const applyStat = (kind: StatKind) => {
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

  const statFilters: { kind: StatKind; label: string; value: number }[] = [
    { kind: "total", label: t("ovStatTotal"), value: stats.total },
    { kind: "open", label: t("ovStatOpen"), value: stats.open },
    { kind: "overdue", label: t("overdue"), value: stats.overdue },
    { kind: "dueSoon", label: t("dueSoon"), value: stats.dueSoon },
    { kind: "settled", label: t("st_settled"), value: stats.settled },
  ];

  // Dropdowns filter as they change, so the URL always holds every active
  // param — including the one a stat chip set.
  const applyParam = (key: "status" | "type" | "priority", value: string) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    // A specific status and a due-risk chip can't both be true.
    if (key === "status") next.delete("risk");
    if (value === "all") next.delete(key);
    else next.set(key, value);

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

  const toggleAll = () =>
    setSelected(selected.length === items.length ? [] : items.map((c) => c.id));

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

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Toolbar
        q={q}
        hasFilters={hasFilters}
        activeStat={activeStat}
        statFilters={statFilters}
        status={status}
        type={type}
        priority={priority}
        reloading={revalidator.state === "loading"}
        onReload={() => revalidator.revalidate()}
        onApplyStat={applyStat}
        onApplyParam={applyParam}
        pagination={<DataPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />}
      />
      <BulkBar
        selectedCount={selected.length}
        bulkStatus={bulkStatus}
        applying={applying}
        onBulkStatusChange={setBulkStatus}
        onApply={applyBulkStatus}
        onExport={exportCsv}
        onClear={() => setSelected([])}
      />

      <ComplaintsTable
        items={items}
        hasFilters={hasFilters}
        canWrite={canWrite}
        selected={selected}
        onToggleAll={toggleAll}
        onToggleOne={toggleOne}
        onRowClick={(id) => navigate(`/admin/complaints/${id}`)}
      />
    </div>
  );
}
