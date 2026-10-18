import {
  Form,
  Link,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { complaintTypeKeys, useT, type Key } from "@/lib/I18n";
import { ComplaintSearch } from "./search";
import type { ComplaintListItem, ComplaintStatus, Paginated } from "./loader";

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

export default function ComplaintsList() {
  const { t, lang } = useT();
  const { items, total, page, pageSize, totalPages } = useLoaderData() as Paginated<ComplaintListItem>;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [params] = useSearchParams();

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "all";
  const type = params.get("type") ?? "all";
  const risk = params.get("risk") ?? "all";
  const hasFilters = q !== "" || status !== "all" || type !== "all" || risk !== "all";

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "tl" ? "fil-PH" : "en-PH", {
      dateStyle: "medium",
    });

  const DUE_SOON_MS = 3 * 24 * 60 * 60 * 1000;

  const isOverdue = (c: ComplaintListItem) =>
    !!c.dueAt &&
    new Date(c.dueAt).getTime() < Date.now() &&
    OPEN_STATUSES.includes(c.status);

  const isDueSoon = (c: ComplaintListItem) => {
    if (!c.dueAt || !OPEN_STATUSES.includes(c.status)) return false;
    const time = new Date(c.dueAt).getTime();
    return time >= Date.now() && time <= Date.now() + DUE_SOON_MS;
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("adminComplaints")}</h1>
          <p className="text-sm text-muted-foreground">
            {total} {hasFilters ? "matching complaint(s)" : "total"}
          </p>
        </div>
        <ComplaintSearch defaultValue={q} />
      </div>

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

        <Select name="risk" defaultValue={risk}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("anyDue")}</SelectItem>
            <SelectItem value="overdue">{t("overdueOnly")}</SelectItem>
            <SelectItem value="dueSoon">{t("dueSoonOnly")}</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit">Filter</Button>

        {hasFilters && (
          <Button asChild type="button" variant="ghost">
            <Link to="/admin/complaints">Clear</Link>
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
              <TableHead>{t("refNumber")}</TableHead>
              <TableHead>Complainant</TableHead>
              <TableHead>Respondent</TableHead>
              <TableHead>{t("complaintType")}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead>Filed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {hasFilters
                    ? "No complaints match your filters."
                    : "No complaints yet."}
                </TableCell>
              </TableRow>
            )}
            {items.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/admin/complaints/${c.id}`)}
              >
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
                <TableCell>{t(c.complaintType as Key)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{t(`st_${c.status}` as Key)}</Badge>
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
