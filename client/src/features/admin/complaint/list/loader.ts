import { api } from "@/lib/api";
import type { LoaderFunctionArgs } from "react-router";

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
  status: ComplaintStatus;
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

export async function ComplaintsLoader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page")) || 1;
  const q = params.get("q")?.trim() ?? "";
  const status = params.get("status") ?? "";
  const type = params.get("type") ?? "";
  const overdue = params.get("overdue") === "true";

  return api
    .post("/complaints/list", {
      searchParams: {
        page,
        pageSize: 20,
        ...(q ? { q } : {}),
        ...(status && status !== "all" ? { status } : {}),
        ...(type && type !== "all" ? { type } : {}),
        ...(overdue ? { overdue: "true" } : {}),
      },
    })
    .json<Paginated<ComplaintListItem>>();
}