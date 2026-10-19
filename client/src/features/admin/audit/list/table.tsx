import { Form, Link, useLoaderData, useSearchParams } from "react-router";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataPagination from "@/components/data-pagination";
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

const ENTITY_TYPES = ["complaint", "hearing", "notice", "user", "auth"] as const;

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
};

const entityLabel: Record<string, string> = {
  complaint: "Complaint",
  hearing: "Mediation",
  notice: "Notice",
  user: "Account",
  auth: "Auth",
};

export default function AuditLog() {
  const { t, lang } = useT();
  const { items, total, page, pageSize, totalPages } = useLoaderData() as Paginated<AuditRow>;
  const [params] = useSearchParams();

  const entityType = params.get("entityType") ?? "all";
  const q = params.get("q") ?? "";
  const hasFilters = entityType !== "all" || q !== "";

  const when = (iso: string) =>
    new Date(iso).toLocaleString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

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

        <div className="ml-auto">
          <DataPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
          />
        </div>
      </Form>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-md border [&>[data-slot=table-container]]:overflow-visible">
        <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:whitespace-normal [&_th]:px-4 [&_th]:whitespace-normal">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>{t("auditWhen")}</TableHead>
              <TableHead>{t("auditWho")}</TableHead>
              <TableHead>{t("auditAction")}</TableHead>
              <TableHead>{t("auditTarget")}</TableHead>
              <TableHead>{t("auditDetails")}</TableHead>
              <TableHead>{t("auditIp")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
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
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                  {when(row.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{row.actorName ?? "System"}</span>
                    {isRole(row.actorRole) && (
                      <span className="text-xs text-muted-foreground">
                        {t(ROLE_LABEL[row.actorRole])}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ACTION_LABEL[row.action] ?? row.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entityLabel[row.entityType] ?? row.entityType}
                  {row.entityId != null && (
                    <span className="tabular-nums"> #{row.entityId}</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[24rem]">{row.summary}</TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
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
