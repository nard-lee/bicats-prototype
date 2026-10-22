import { api } from "@/lib/api";
import type { LoaderFunctionArgs } from "react-router";
import type { ComplaintPriority } from "../priority";

export type ComplaintStatus =
  | "received"
  | "summoned"
  | "mediation"
  | "conciliation"
  | "settled"
  | "certified"
  | "dismissed";

export type ComplaintListItem = {
  id: number;
  reference: string;
  complainantName: string;
  respondentName: string;
  complaintType: string;
  complaintTypeOther: string | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  createdAt: string; 
  viewedAt: string | null;
  dueAt: string | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ComplaintStats = {
  total: number;
  open: number;
  overdue: number;
  dueSoon: number;
  settled: number;
};

export type ComplaintsPage = Paginated<ComplaintListItem> & {
  stats: ComplaintStats;
};

export async function ComplaintsLoader({ request }: LoaderFunctionArgs): Promise<ComplaintsPage> {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page")) || 1;
  const q = params.get("q")?.trim() ?? "";
  const status = params.get("status") ?? "";
  const type = params.get("type") ?? "";
  const priority = params.get("priority") ?? "";
  const risk = params.get("risk") ?? "all";
  const open = risk === "open";
  const overdue = risk === "overdue";
  const dueSoon = risk === "dueSoon";

  const [result, stats] = await Promise.all([
    api
      .post("/complaints/list", {
        searchParams: {
          page,
          pageSize: 20,
          ...(q ? { q } : {}),
          ...(status && status !== "all" ? { status } : {}),
          ...(type && type !== "all" ? { type } : {}),
          ...(priority && priority !== "all" ? { priority } : {}),
          ...(open ? { open: "true" } : {}),
          ...(overdue ? { overdue: "true" } : {}),
          ...(dueSoon ? { dueSoon: "true" } : {}),
        },
      })
      .json<Paginated<ComplaintListItem>>(),
    api.get("/analytics/stats").json<ComplaintStats>(),
  ]);

  return { ...result, stats };
}