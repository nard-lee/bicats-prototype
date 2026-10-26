import { Form, Link, useLoaderData, useSearchParams } from "react-router";
import { useState } from "react";
import { FileDown, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataPagination from "@/components/data-pagination";
import { api } from "@/lib/api";
import { csvCell } from "@/lib/csv";
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
import { useT } from "@/lib/I18n";
import { ROLE_LABEL, isRole } from "@/lib/roles";
import type { AuditRow, Paginated } from "./loader";

const ENTITY_TYPES = ["complaint", "hearing", "notice", "user", "auth", "setting"] as const;

// Friendly labels for the dotted action codes written by the server.
const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Signed in",
  "user.create": "Account created",
  "user.update": "Account updated",
  "complaint.status.update": "Case status changed",
  "complaint.priority.update": "Case priority changed",
  "complaint.bulk_status": "Bulk status update",
  "complaint.reopen": "Case reopened",
  "hearing.create": "Mediation scheduled",
  "hearing.update": "Mediation updated",
  "hearing.cancel": "Mediation cancelled",
  "notice.create": "Notice created",
  "notice.update": "Notice updated",
  "notice.delete": "Notice deleted",
  "setting.update": "Settings updated",
};

const entityLabel: Record<string, string> = {
  complaint: "Complaint",
  hearing: "Mediation",
  notice: "Notice",
  user: "Account",
  auth: "Auth",
  setting: "Settings",
};

export default function AuditLog() {
  const { t, lang } = useT();
  const { items, total, page, pageSize, totalPages } = useLoaderData() as Paginated<AuditRow>;
  const [params] = useSearchParams();

  const entityType = params.get("entityType") ?? "all";
  const q = params.get("q") ?? "";
  const hasFilters = entityType !== "all" || q !== "";

  const [exporting, setExporting] = useState(false);

  const when = (iso: string) =>
    new Date(iso).toLocaleString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  async function exportCsv() {
    setExporting(true);
    try {
      const rows = await api
        .get("audit/export", {
          searchParams: {
            ...(entityType !== "all" ? { entityType } : {}),
            ...(q ? { q } : {}),
          },
        })
        .json<AuditRow[]>();

      const lines = rows.map((r) =>
        [
          when(r.createdAt),
          r.actorName ?? "System",
          isRole(r.actorRole) ? t(ROLE_LABEL[r.actorRole]) : "",
          ACTION_LABEL[r.action] ?? r.action,
          r.target,
          r.summary,
          r.ip ?? "",
        ]
          .map((value) => csvCell(String(value)))
          .join(","),
      );

      const csv = ["When,Who,Role,Action,Target,Details,IP", ...lines].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("adminAudit")}</h1>
          <p className="text-sm text-muted-foreground">{t("auditSubtitle")}</p>
        </div>
        <Badge variant="secondary">
          {total} {hasFilters ? "matching" : "total"}
        </Badge>
      </div>

      <Form method="get" className="flex shrink-0 flex-wrap items-center gap-2">
        <Select name="entityType" defaultValue={entityType}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("auditAllTypes")}</SelectItem>
            {ENTITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {entityLabel[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          name="q"
          defaultValue={q}
          placeholder={t("auditSearchPlaceholder")}
          className="w-[260px]"
        />

        <Button type="submit">Filter</Button>

        {hasFilters && (
          <Button asChild type="button" variant="ghost">
            <Link to="/admin/audit">Clear</Link>
          </Button>
        )}

        <Button type="button" variant="outline" onClick={exportCsv} disabled={exporting}>
          <FileDown className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>

        <div className="ml-auto">
          <DataPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
          />
        </div>
      </Form>

      <div className="-mx-4 divide-y border-y sm:-mx-6 md:hidden">
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ScrollText className="size-5" />
            </div>
            <span className="text-sm">
              {hasFilters ? "No activity matches your filters." : t("auditEmpty")}
            </span>
          </div>
        )}
        {items.map((row) => (
          <div key={row.id} className="space-y-1 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground tabular-nums">
                {when(row.createdAt)}
              </span>
              <Badge variant="secondary" className="shrink-0">
                {ACTION_LABEL[row.action] ?? row.action}
              </Badge>
            </div>
            <p className="text-sm break-words">{row.summary}</p>
            <p className="text-sm break-words text-muted-foreground">
              {row.actorName ?? "System"}
              {isRole(row.actorRole) && ` · ${t(ROLE_LABEL[row.actorRole])}`}
              {row.target && ` · ${row.target}`}
            </p>
          </div>
        ))}
      </div>

      <div className="-mx-4 border-y sm:-mx-6 md:min-h-0 md:flex-1 md:overflow-auto [&>[data-slot=table-container]]:overflow-visible">
        <Table className="hidden [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 md:table">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>{t("auditWhen")}</TableHead>
              <TableHead>{t("auditWho")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("role")}</TableHead>
              <TableHead>{t("auditAction")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("auditTarget")}</TableHead>
              <TableHead>{t("auditDetails")}</TableHead>
              <TableHead className="hidden xl:table-cell">{t("auditIp")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <ScrollText className="size-5" />
                    </div>
                    <span>{hasFilters ? "No activity matches your filters." : t("auditEmpty")}</span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {items.map((row) => (
              <TableRow key={row.id} className="transition-colors hover:bg-muted/50">
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                  {when(row.createdAt)}
                </TableCell>
                <TableCell className="font-bold">{row.actorName ?? "System"}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {isRole(row.actorRole) ? (
                    <Badge variant="secondary">{t(ROLE_LABEL[row.actorRole])}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ACTION_LABEL[row.action] ?? row.action}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  <span
                    className={
                      row.target.includes("(record deleted)") ? "italic" : undefined
                    }
                  >
                    {row.target}
                  </span>
                </TableCell>
                <TableCell className="max-w-[24rem] whitespace-normal">{row.summary}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground tabular-nums xl:table-cell">
                  {row.ip ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
