import { redirect, type LoaderFunctionArgs } from "react-router";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/hooks/use-auth";

export type AuditRow = {
  id: number;
  actorId: number | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  summary: string;
  ip: string | null;
  createdAt: string;
  target: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function AuditLoader({ request }: LoaderFunctionArgs) {
  const current = await getCurrentUser();
  if (!current) throw redirect("/login");
  if (current.role !== "admin") throw redirect("/admin");

  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page")) || 1;
  const entityType = params.get("entityType") ?? "";
  const q = params.get("q") ?? "";

  return api
    .get("/audit", {
      searchParams: {
        page,
        limit: 25,
        ...(entityType && entityType !== "all" ? { entityType } : {}),
        ...(q ? { q } : {}),
      },
    })
    .json<Paginated<AuditRow>>();
}
