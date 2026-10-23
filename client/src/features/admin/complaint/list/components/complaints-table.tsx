import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT, type Key } from "@/lib/I18n";
import { PRIORITY_STYLE } from "../../priority";
import { complaintTypeLabel } from "../../type-label";
import type { ComplaintListItem, ComplaintStatus } from "../loader";
import EmptyState from "./empty-state";

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

type ComplaintsTableProps = {
  items: ComplaintListItem[];
  hasFilters: boolean;
  canWrite: boolean;
  selected: number[];
  onToggleAll: () => void;
  onToggleOne: (id: number) => void;
  onRowClick: (id: number) => void;
};

export default function ComplaintsTable({
  items,
  hasFilters,
  canWrite,
  selected,
  onToggleAll,
  onToggleOne,
  onRowClick,
}: ComplaintsTableProps) {
  const { t, lang } = useT();

  const allSelected = items.length > 0 && selected.length === items.length;
  const someSelected = selected.length > 0 && !allSelected;

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

  return (
    <div className="-mx-4 border-y sm:-mx-6 md:min-h-0 md:flex-1 md:overflow-auto [&>[data-slot=table-container]]:overflow-visible">
      {items.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <div className="divide-y md:hidden">
            {items.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                  selected.includes(c.id) && "bg-muted/50",
                )}
                onClick={() => onRowClick(c.id)}
              >
                {canWrite && (
                  <span className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      className={CHECKBOX}
                      checked={selected.includes(c.id)}
                      onCheckedChange={() => onToggleOne(c.id)}
                      aria-label={`${t("clSelectRow")} ${c.reference}`}
                    />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold tracking-wide">
                      {c.reference}
                    </span>
                    {!c.viewedAt && (
                      <Badge className="h-5 px-1.5 text-[10px] uppercase tracking-wide">
                        {t("notifNew")}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="ml-auto">
                      {t(`st_${c.status}` as Key)}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm">
                    {c.complainantName}
                    <span className="text-muted-foreground"> → </span>
                    {c.respondentName}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {c.priority !== "none" && (
                      <Badge className={cn("border", PRIORITY_STYLE[c.priority])}>
                        {t(`pr_${c.priority}` as Key)}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {t("dueDate")}: {c.dueAt ? date(c.dueAt) : "—"}
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Table className="hidden [&_td]:px-4 [&_td]:py-3 [&_td]:whitespace-normal [&_th]:px-4 [&_th]:whitespace-normal md:table">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              {canWrite && (
                <TableHead className="w-10">
                  <Checkbox
                    className={CHECKBOX}
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={onToggleAll}
                    aria-label={t("clSelectAll")}
                  />
                </TableHead>
              )}
              <TableHead>{t("refNumber")}</TableHead>
              <TableHead>{t("complainant")}</TableHead>
              <TableHead>{t("respondent")}</TableHead>
              <TableHead className="hidden xl:table-cell">{t("complaintType")}</TableHead>
              <TableHead>{t("clStatus")}</TableHead>
              <TableHead>{t("priority")}</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead className="hidden 2xl:table-cell">{t("clFiled")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow
                key={c.id}
                data-state={selected.includes(c.id) ? "selected" : undefined}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onRowClick(c.id)}
              >
                {canWrite && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      className={CHECKBOX}
                      checked={selected.includes(c.id)}
                      onCheckedChange={() => onToggleOne(c.id)}
                      aria-label={`${t("clSelectRow")} ${c.reference}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-semibold tracking-wide">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    {c.reference}
                    {!c.viewedAt && (
                      <Badge className="h-5 px-1.5 text-[10px] uppercase tracking-wide">
                        {t("notifNew")}
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>{c.complainantName}</TableCell>
                <TableCell>{c.respondentName}</TableCell>
                <TableCell className="hidden xl:table-cell">
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
                <TableCell>
                  {c.dueAt ? (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
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
                <TableCell className="hidden 2xl:table-cell">
                  <span className="whitespace-nowrap">{date(c.createdAt)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </>
      )}
    </div>
  );
}
